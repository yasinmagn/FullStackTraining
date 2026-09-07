import express, { type Express, type ErrorRequestHandler, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError, z } from 'zod';
import { NotFoundError, ValidationError } from '../domain/errors.ts';
import { livenessHandler, readinessHandler, type HealthCheck } from '../observability/health.ts';
import { createLogger, type Logger } from '../observability/logger.ts';
import { createMetrics, type Metrics } from '../observability/metrics.ts';

export interface AppOptions {
  logger?: Logger;
  metrics?: Metrics;
  healthChecks?: HealthCheck[];
  registerExtraRoutes?: (app: Express) => void;
}

/**
 * REQUEST CONTEXT: an id, a child logger, and timing.
 *
 * The child logger is what makes debugging tractable. Every line written during
 * a request carries the same `requestId`, so "show me everything that happened
 * to this request" is a field filter rather than a guess.
 */
function requestContext(logger: Logger, metrics: Metrics): RequestHandler {
  return (req, res, next) => {
    req.id = req.get('x-request-id') ?? randomUUID();
    res.setHeader('x-request-id', req.id);
    req.log = logger.child({ requestId: req.id });

    const startedAt = process.hrtime.bigint();

    /*
     * Log and measure on 'finish' - you cannot know the status or duration
     * until the response has actually been sent.
     */
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

      /*
       * `req.route?.path` is the ROUTE PATTERN ('/api/tasks/:id'), not the
       * resolved URL. Using the resolved path as a metric label would create
       * one time series per task id and melt your metrics backend.
       */
      const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : 'unmatched';
      const labels = { method: req.method, route, status: String(res.statusCode) };

      metrics.incrementCounter('http_requests_total', labels);
      metrics.observeHistogram('http_request_duration_ms', durationMs, { method: req.method, route });

      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      req.log[level]('http.request', {
        method: req.method,
        path: req.originalUrl,
        route,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });

    next();
  };
}

const createTaskSchema = z.object({ title: z.string().trim().min(3).max(200) });

export function createApp({
  logger = createLogger(),
  metrics = createMetrics(),
  healthChecks = [],
  registerExtraRoutes,
}: AppOptions = {}): Express {
  const app = express();
  const tasks = new Map<string, { id: string; title: string; done: boolean }>();

  app.disable('x-powered-by');
  app.use(requestContext(logger, metrics));
  app.use(express.json({ limit: '100kb' }));

  // Liveness: process only, no dependencies. See health.ts for why.
  app.get('/health/live', livenessHandler());
  app.get('/health/ready', readinessHandler(healthChecks));

  /*
   * The metrics endpoint. In production, bind it to an internal port or put it
   * behind auth - it exposes your route names, traffic shape and error rates.
   */
  app.get('/metrics', (_req, res) => {
    res.setHeader('content-type', 'text/plain; version=0.0.4');
    res.send(metrics.render());
  });

  app.get('/api/tasks', (_req, res) => {
    res.json({ data: [...tasks.values()] });
  });

  app.post('/api/tasks', (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = { id: randomUUID(), title: input.title, done: false };
    tasks.set(task.id, task);

    // A business event, distinct from the HTTP access log. This is the line you
    // build a dashboard on.
    req.log.info('task.created', { taskId: task.id });

    res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
  });

  app.get('/api/tasks/:id', (req, res) => {
    const task = tasks.get(req.params.id);
    if (!task) throw new NotFoundError('Task', req.params.id);
    res.json({ data: task });
  });

  registerExtraRoutes?.(app);

  app.use((req, _res, next) => next(new NotFoundError('Route', `${req.method} ${req.path}`)));
  app.use(errorHandler());

  return app;
}

function errorHandler(): ErrorRequestHandler {
  return (error: unknown, req, res, _next) => {
    const send = (status: number, code: string, message: string, details?: unknown) =>
      res.status(status).json({ error: { code, message, ...(details ? { details } : {}), requestId: req.id } });

    if (error instanceof ZodError) {
      const details: Record<string, string> = {};
      for (const issue of error.issues) details[issue.path.join('.') || '_root'] ??= issue.message;
      return send(400, 'VALIDATION_FAILED', 'Request validation failed', details);
    }
    if (error instanceof ValidationError) return send(400, 'VALIDATION_FAILED', error.message, error.details);
    if (error instanceof NotFoundError) return send(404, 'NOT_FOUND', error.message);

    const status = (error as { status?: number }).status;
    if (typeof status === 'number' && status < 500) {
      return send(status, 'BAD_REQUEST', (error as Error).message);
    }

    // The error log carries the stack; the response carries nothing.
    req.log.error('unhandled.error', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return send(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  };
}

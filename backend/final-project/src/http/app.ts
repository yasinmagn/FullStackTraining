import express, { type ErrorRequestHandler, type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../domain/index.ts';
import { createAuthRouter, createTaskRouter } from './routes.ts';
import { requestContext } from './middleware.ts';
import { livenessHandler, readinessHandler, type HealthCheck } from '../observability/health.ts';
import type { AuthService } from '../service/authService.ts';
import type { TaskService } from '../service/taskService.ts';
import type { Logger } from '../observability/logger.ts';
import type { Config } from '../config/index.ts';

export interface AppOptions {
  config: Config;
  authService: AuthService;
  taskService: TaskService;
  logger: Logger;
  healthChecks?: HealthCheck[];
  enableRateLimit?: boolean;
  /** Test seam. Routes land before the 404 and error handlers. */
  registerExtraRoutes?: (app: Express) => void;
}

/**
 * THE COMPOSITION ROOT for HTTP.
 *
 * Every dependency arrives as an argument - the app builds no services, and the
 * services build no repositories. Wiring happens once, in server.ts.
 *
 * `listen` is NOT called here, which is what lets the tests drive the whole
 * stack in-process with supertest.
 */
export function createApp({
  config,
  authService,
  taskService,
  logger,
  healthChecks = [],
  enableRateLimit = true,
  registerExtraRoutes,
}: AppOptions): Express {
  const app = express();

  app.disable('x-powered-by');

  /*
   * The number of proxies in front of you. NEVER `true` blindly: that makes
   * Express believe whatever X-Forwarded-For says, and a client can forge it to
   * dodge the rate limiter entirely.
   */
  app.set('trust proxy', 1);

  app.use(helmet());

  // An allow-list, never a reflector. CORS is a BROWSER protection - it does
  // nothing about curl, so it never replaces authentication.
  app.use(cors({ origin: config.CORS_ORIGINS, credentials: true, maxAge: 86_400 }));

  app.use(requestContext(logger));

  // A body limit is a security control: without it one request can make you
  // allocate gigabytes.
  app.use(express.json({ limit: '100kb' }));

  if (enableRateLimit) {
    app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
  }

  // Liveness checks the PROCESS only. Readiness checks dependencies.
  // (Liveness that pings the database restarts every pod during a blip.)
  app.get('/health/live', livenessHandler());
  app.get('/health/ready', readinessHandler(healthChecks));

  app.use('/auth', createAuthRouter(authService, enableRateLimit));
  app.use('/api/tasks', createTaskRouter(taskService, authService));

  registerExtraRoutes?.(app);

  app.use((req, _res, next) => next(new NotFoundError('Route', `${req.method} ${req.path}`)));
  app.use(errorHandler(config));

  return app;
}

/**
 * The ONE place domain errors become HTTP responses.
 *
 * Every layer below throws errors that know nothing about HTTP. This table is
 * the entire presentation concern, which is what makes the API's error contract
 * something you can read in one screen.
 */
function errorHandler(config: Config): ErrorRequestHandler {
  // Four parameters: Express identifies error handlers by arity. Drop `_next`
  // and this silently becomes ordinary middleware that never runs.
  return (error: unknown, req, res, _next) => {
    const send = (status: number, code: string, message: string, details?: unknown) =>
      res.status(status).json({
        error: { code, message, ...(details ? { details } : {}), requestId: req.id },
      });

    if (error instanceof ZodError) {
      // Report EVERY bad field, not just the first - a form that surfaces one
      // problem per submit is a bad form.
      const details: Record<string, string> = {};
      for (const issue of error.issues) details[issue.path.join('.') || '_root'] ??= issue.message;
      return send(400, 'VALIDATION_FAILED', 'Request validation failed', details);
    }

    if (error instanceof ValidationError) return send(400, 'VALIDATION_FAILED', error.message, error.details);

    if (error instanceof UnauthorizedError) {
      // The standard way to tell a client how to authenticate.
      res.setHeader('www-authenticate', 'Bearer');
      return send(401, 'UNAUTHORIZED', error.message);
    }

    if (error instanceof ForbiddenError) return send(403, 'FORBIDDEN', error.message);
    if (error instanceof NotFoundError) return send(404, 'NOT_FOUND', error.message);
    // 409, not 400: the request was well-formed, it conflicts with state.
    if (error instanceof ConflictError) return send(409, 'CONFLICT', error.message, error.details);

    // express.json() sets `status` on its own errors: 400 for malformed JSON,
    // 413 for an oversized body. Honour them rather than returning 500.
    const status = (error as { status?: number }).status;
    if (typeof status === 'number' && status < 500) {
      return send(status, 'BAD_REQUEST', (error as Error).message);
    }

    /*
     * Anything else is OUR bug. Log everything; return nothing.
     *
     * A stack trace in a response tells an attacker your directory layout, your
     * dependency versions and often your schema. There is a test asserting a
     * connection string in an error message never reaches the client.
     */
    req.log.error('unhandled.error', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const body = send(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    void config; // reserved: expose stack in development if you want it
    return body;
  };
}

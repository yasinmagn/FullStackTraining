import express, { type Express, type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { createAuthRouter, type UserStore } from '../auth/authRoutes.ts';
import { createTaskRouter, type TaskStore } from './taskRoutes.ts';
import { ForbiddenError, UnauthorizedError } from '../domain/authErrors.ts';
import { ConflictError, NotFoundError, ValidationError } from '../domain/errors.ts';
import type { TokenConfig } from '../auth/tokens.ts';

export interface AppOptions {
  users: UserStore;
  tasks: TaskStore;
  tokens: TokenConfig;
  allowedOrigins?: string[];
  logger?: Pick<Console, 'log' | 'error'>;
  enableRateLimit?: boolean;
  /**
   * A test seam. Routes registered here land BEFORE the 404 and error
   * handlers - the only place a route can usefully go, since in Express
   * registration order IS the routing algorithm.
   */
  registerExtraRoutes?: (app: Express) => void;
}

export function createApp({
  users,
  tasks,
  tokens,
  allowedOrigins = ['http://localhost:5173'],
  logger = console,
  enableRateLimit = true,
  registerExtraRoutes,
}: AppOptions): Express {
  const app = express();

  app.disable('x-powered-by');

  /*
   * `trust proxy` matters for rate limiting and logging behind a load balancer
   * or CDN. Without it, every request appears to come from the proxy's IP, so a
   * per-IP rate limit throttles ALL your users together.
   *
   * Set it to the number of proxies you actually have, never `true` blindly:
   * `true` makes Express believe whatever X-Forwarded-For says, and a client
   * can forge that header to dodge the rate limit entirely.
   */
  app.set('trust proxy', 1);

  /*
   * HELMET sets a batch of security headers. What each one does:
   *
   *   Content-Security-Policy    the strongest XSS defence there is - restricts
   *                              where scripts may load from
   *   Strict-Transport-Security  browser refuses plain HTTP to this host
   *   X-Content-Type-Options     stops MIME sniffing (an "image" run as JS)
   *   X-Frame-Options            clickjacking - nobody may iframe you
   *   Referrer-Policy            stops URLs leaking to third parties
   *
   * For a JSON API the CSP matters less (there is no HTML to inject into), but
   * it costs nothing and protects error pages and any docs you serve.
   */
  app.use(helmet());

  /*
   * CORS: an ALLOW-LIST, never a reflector.
   *
   *   ✗ origin: true                     reflects any origin - no protection
   *   ✗ origin: '*' with credentials     the browser refuses this combination
   *   ✓ an explicit list
   *
   * Remember what CORS is and is not. It is a BROWSER protection: it stops
   * evil.com's JavaScript reading your API using the visitor's cookies. It does
   * nothing about curl, Postman, or a server-side attacker - so CORS is never
   * a substitute for authentication.
   */
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      maxAge: 86_400, // cache the preflight for a day
    }),
  );

  app.use((req, res, next) => {
    req.id = req.get('x-request-id') ?? randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });

  /*
   * A body size limit is a security control. Without it, one request can make
   * you allocate gigabytes - the cheapest denial of service there is.
   */
  app.use(express.json({ limit: '100kb' }));

  // A broad limit for the whole API. The auth routes add a much tighter one.
  if (enableRateLimit) {
    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 300,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
      }),
    );
  }

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/auth', createAuthRouter(users, tokens));
  app.use('/api/tasks', createTaskRouter(tasks, tokens));

  registerExtraRoutes?.(app);

  app.use((req, _res, next) => next(new NotFoundError('Route', `${req.method} ${req.path}`)));
  app.use(errorHandler(logger));

  return app;
}

function errorHandler(logger: Pick<Console, 'error'>): ErrorRequestHandler {
  return (error: unknown, req, res, _next) => {
    const requestId = req.id;
    const send = (status: number, code: string, message: string, details?: unknown) =>
      res.status(status).json({ error: { code, message, ...(details ? { details } : {}), requestId } });

    if (error instanceof ZodError) {
      const details: Record<string, string> = {};
      for (const issue of error.issues) details[issue.path.join('.') || '_root'] ??= issue.message;
      return send(400, 'VALIDATION_FAILED', 'Request validation failed', details);
    }
    if (error instanceof ValidationError) return send(400, 'VALIDATION_FAILED', error.message, error.details);
    if (error instanceof UnauthorizedError) {
      /*
       * WWW-Authenticate is the standard way to say how to authenticate. It is
       * also what tells a well-behaved client to retry with a token.
       */
      res.setHeader('www-authenticate', 'Bearer');
      return send(401, error.code.toUpperCase(), error.message);
    }
    if (error instanceof ForbiddenError) {
      // status is 403 or 404 - see requireOwnership for why hiding existence
      // is sometimes the right answer.
      return send(error.status, error.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', error.message);
    }
    if (error instanceof NotFoundError) return send(404, 'NOT_FOUND', error.message);
    if (error instanceof ConflictError) return send(409, 'CONFLICT', error.message, error.details);

    const status = (error as { status?: number }).status;
    if (typeof status === 'number' && status < 500) {
      return send(status, 'BAD_REQUEST', (error as Error).message);
    }

    /*
     * Log everything; return nothing.
     *
     * A stack trace in a 500 response tells an attacker your directory layout,
     * your dependency versions and often your schema. There is a test that
     * throws an error containing a connection string and asserts none of it
     * reaches the client.
     */
    logger.error(
      JSON.stringify({
        level: 'error',
        requestId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
    );
    return send(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  };
}

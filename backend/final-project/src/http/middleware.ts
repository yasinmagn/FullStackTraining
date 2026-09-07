import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { UnauthorizedError } from '../domain/index.ts';
import type { AuthService } from '../service/authService.ts';
import type { Logger } from '../observability/logger.ts';

/** Request id + a child logger bound to it + one access log line per request. */
export function requestContext(logger: Logger): RequestHandler {
  return (req, res, next) => {
    // Honour an upstream id so one trace follows a request across services.
    req.id = req.get('x-request-id') ?? randomUUID();
    res.setHeader('x-request-id', req.id);
    req.log = logger.child({ requestId: req.id });

    const startedAt = process.hrtime.bigint();

    /*
     * CAPTURE THE ROUTE PATTERN WHILE IT IS STILL AVAILABLE.
     *
     * The obvious version - reading `req.baseUrl` inside the 'finish' listener -
     * is subtly wrong. Express sets `baseUrl` while a router is dispatching and
     * RESTORES it as the stack unwinds, so by the time 'finish' fires you get
     * `/:id` instead of `/api/tasks/:id`, and different routes report
     * inconsistent labels.
     *
     * Wrapping `res.end` reads it in the handler's own stack frame, where it is
     * still correct. This is what real instrumentation libraries do.
     *
     * It matters because this label becomes a metric dimension: the resolved
     * path would create one time series per task id.
     */
    let routePattern = 'unmatched';
    const originalEnd = res.end.bind(res);
    res.end = function patchedEnd(this: typeof res, ...args: Parameters<typeof originalEnd>) {
      if (req.route?.path) {
        // Collapse the trailing slash a router root produces ('/api/tasks/').
        routePattern = `${req.baseUrl}${req.route.path}`.replace(/(.)\/$/, '$1');
      }
      return originalEnd(...args);
    } as typeof res.end;

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      req.log[level]('http.request', {
        method: req.method,
        path: req.originalUrl,
        route: routePattern,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        userId: req.user?.sub,
      });
    });

    next();
  };
}

/**
 * AUTHENTICATION (401). "Who are you?"
 *
 * Distinct from authorisation (403, "may you do this?"). In this app
 * authorisation is enforced by query scoping rather than a separate middleware
 * - see taskRepository.listForOwner.
 */
export function requireAuth(auth: AuthService): RequestHandler {
  return (req, _res, next) => {
    const header = req.get('authorization');
    const [scheme, token] = header?.split(' ') ?? [];

    // Strict parsing. A lenient parser that also accepts ?token= is a mistake:
    // query strings end up in server logs, browser history and Referer headers.
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      req.user = auth.verifyToken(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

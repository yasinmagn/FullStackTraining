import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { TokenError, verifyAccessToken, type AccessTokenPayload, type TokenConfig } from './tokens.ts';
import { ForbiddenError, UnauthorizedError } from '../domain/authErrors.ts';

/**
 * AUTHENTICATION vs AUTHORISATION. Two different questions, two different
 * middleware, two different status codes:
 *
 *   Authentication (401)  WHO ARE YOU?     -> `requireAuth`
 *   Authorisation  (403)  MAY YOU DO THIS? -> `requireRole`, `requireOwnership`
 *
 * Conflating them is the most common API bug in this area, and it leaks
 * information: returning 403 to an anonymous request tells an attacker the
 * resource exists.
 */

/** Populate `req.user` if a valid token is present. Never rejects. */
export function attachUser(config: TokenConfig): RequestHandler {
  return (req, _res, next) => {
    const token = extractBearerToken(req);
    if (!token) return next();

    try {
      req.user = verifyAccessToken(token, config);
    } catch {
      // A bad token on an optional-auth route is simply "not logged in".
      // `requireAuth` is what turns that into a 401.
    }
    next();
  };
}

/** 401 if there is no valid token. */
export function requireAuth(config: TokenConfig): RequestHandler {
  return (req, _res, next) => {
    const token = extractBearerToken(req);

    if (!token) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      req.user = verifyAccessToken(token, config);
      next();
    } catch (error) {
      if (error instanceof TokenError && error.reason === 'expired') {
        // Distinguishing "expired" from "invalid" tells the client to refresh
        // rather than to bounce the user to a login screen. It leaks nothing
        // useful - the attacker already holds the token.
        return next(new UnauthorizedError('Token has expired', 'token_expired'));
      }
      next(new UnauthorizedError('Invalid token'));
    }
  };
}

/** 403 if the authenticated user does not hold one of these roles. */
export function requireRole(...roles: AccessTokenPayload['role'][]): RequestHandler {
  return (req, _res, next) => {
    // Order matters: no user at all is 401, not 403.
    if (!req.user) return next(new UnauthorizedError('Authentication required'));

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to do that'));
    }
    next();
  };
}

/**
 * BROKEN ACCESS CONTROL - number one on the OWASP Top 10, and the single most
 * common serious bug in real APIs.
 *
 * The bug, in its usual form:
 *
 *     app.get('/api/tasks/:id', requireAuth, async (req, res) => {
 *       const task = await repo.findById(req.params.id);
 *       res.json(task);            // <-- ANY logged-in user reads ANY task
 *     });
 *
 * Authentication passed. Authorisation was never checked. This is IDOR
 * (Insecure Direct Object Reference), and it is found in production constantly
 * because the happy path works perfectly in testing - you are logged in as the
 * owner.
 *
 * Two rules:
 *   1. Authorise EVERY resource access, not just the route.
 *   2. Prefer scoping the QUERY (`WHERE owner_id = $1`) over fetching and then
 *      checking. Scoping cannot be forgotten by the next person to edit it.
 */
export function requireOwnership<T>(
  load: (req: Request) => Promise<T | null>,
  ownerOf: (resource: T) => string,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));

    const resource = await load(req);

    /*
     * 404, not 403, for someone else's resource.
     *
     * Returning 403 confirms the resource EXISTS, which is an information leak:
     * an attacker can enumerate valid ids by watching for 403 instead of 404.
     * "You may not see this" and "this does not exist" should be
     * indistinguishable to someone who is not allowed to see it.
     *
     * Admins are the exception - they may see everything.
     */
    if (!resource || (ownerOf(resource) !== req.user.sub && req.user.role !== 'admin')) {
      return next(new ForbiddenError('Not found', 404));
    }

    (req as Request & { resource?: T }).resource = resource;
    next();
  };
}

/**
 * Parse `Authorization: Bearer <token>`.
 *
 * Deliberately strict. A lenient parser that also accepts a `?token=` query
 * parameter is a mistake: query strings end up in server logs, in browser
 * history, and in the Referer header sent to third-party sites.
 */
function extractBearerToken(req: Request): string | null {
  const header = req.get('authorization');
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
}

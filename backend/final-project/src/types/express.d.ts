import type { AccessTokenPayload } from '../service/authService.ts';
import type { Logger } from '../observability/logger.ts';

/**
 * Per-request context, added by middleware.
 *
 * `id` and `log` are set by the FIRST middleware and so are non-optional.
 * `user` is OPTIONAL, because unauthenticated requests are legitimate - typing
 * it as required would let you write `req.user.sub` on a public route and crash
 * at runtime with the compiler's blessing.
 */
declare global {
  namespace Express {
    interface Request {
      id: string;
      log: Logger;
      user?: AccessTokenPayload;
    }
  }
}

export {};

import type { AccessTokenPayload } from '../auth/tokens.ts';

/**
 * Declaration merging, as in Stage 3 - but note that `user` is OPTIONAL here
 * and `id` was required.
 *
 * That difference is load-bearing. `req.id` is set by the very first
 * middleware, so it always exists. `req.user` only exists after a successful
 * `requireAuth`, and unauthenticated requests are legitimate. Typing it as
 * non-optional would let you write `req.user.sub` on a public route and crash
 * at runtime, with the compiler having assured you it was fine.
 *
 * Make the type tell the truth, even when the truth is less convenient.
 */
declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: AccessTokenPayload;
    }
  }
}

export {};

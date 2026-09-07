import type { Logger } from '../observability/logger.ts';

/**
 * Declaration merging for the per-request context.
 *
 * Both fields are set by the FIRST middleware, before anything else can run, so
 * both are non-optional. Compare with Stage 6, where `user` is optional because
 * unauthenticated requests are legitimate - the type should tell the truth
 * about when a field actually exists.
 */
declare global {
  namespace Express {
    interface Request {
      id: string;
      /** A child logger bound to this request's id. */
      log: Logger;
    }
  }
}

export {};

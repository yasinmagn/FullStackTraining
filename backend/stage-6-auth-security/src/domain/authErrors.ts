import { DomainError } from './errors.ts';

/** 401 - we do not know who you are. */
export class UnauthorizedError extends DomainError {
  readonly status = 401;
  constructor(message = 'Authentication required', readonly code = 'unauthorized') {
    super(message);
  }
}

/**
 * 403 - we know who you are, and no.
 *
 * `status` is overridable so ownership checks can answer 404 instead, hiding
 * the existence of a resource the caller may not see. See `requireOwnership`.
 */
export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden', readonly status: 403 | 404 = 403) {
    super(message);
  }
}

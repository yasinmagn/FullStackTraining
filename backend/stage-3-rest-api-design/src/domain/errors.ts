/**
 * DOMAIN ERRORS.
 *
 * Note that not one of these mentions an HTTP status code. `NotFoundError`
 * means "the thing you asked for does not exist" - a fact that is true whether
 * the caller is a web request, a CLI or a queue consumer.
 *
 * The HTTP layer maps them to statuses in exactly one place
 * (`src/http/errorHandler.ts`). That mapping is a presentation concern, and
 * keeping it out of the domain is what lets you reuse the service unchanged.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The requested resource does not exist. */
export class NotFoundError extends DomainError {
  constructor(
    readonly resource: string,
    readonly id: string,
  ) {
    super(`${resource} ${id} was not found`);
  }
}

/** The input is structurally valid but breaks a business rule. */
export class ValidationError extends DomainError {
  constructor(
    message: string,
    readonly details: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** The request conflicts with the current state (duplicate, bad transition). */
export class ConflictError extends DomainError {
  constructor(
    message: string,
    readonly details: Record<string, string> = {},
  ) {
    super(message);
  }
}

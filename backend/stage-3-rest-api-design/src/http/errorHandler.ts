import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ConflictError, NotFoundError, ValidationError } from '../domain/errors.ts';

/**
 * THE ONE PLACE domain errors become HTTP responses.
 *
 * Every layer below this throws domain errors that know nothing about HTTP.
 * This translation table is the entire presentation concern, and having it in
 * one file means the API's error contract is something you can read.
 */

/**
 * A consistent error envelope.
 *
 * Clients should be able to write ONE error handler. If your 400s look
 * different from your 404s, every consumer writes special cases - and gets one
 * of them wrong.
 *
 * `code` is the machine-readable part. Clients branch on it; `message` is for
 * humans and may be reworded without breaking anyone.
 */
export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    requestId?: string;
  };
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError('Route', `${req.method} ${req.path}`));
};

/** Flatten zod issues to `{ 'path.to.field': 'message' }`. */
function zodDetails(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_root';
    details[key] ??= issue.message;
  }
  return details;
}

export function errorHandler({
  logger = console,
  exposeStack = false,
}: { logger?: Pick<Console, 'error'>; exposeStack?: boolean } = {}): ErrorRequestHandler {
  // Four parameters. Express identifies error handlers by arity - drop `_next`
  // and this silently becomes ordinary middleware that never runs.
  return (error: unknown, req, res, _next) => {
    const requestId = req.id;

    // --- Translate ---------------------------------------------------------

    if (error instanceof ZodError) {
      return res.status(400).json(body('VALIDATION_FAILED', 'Request validation failed', zodDetails(error)));
    }

    if (error instanceof ValidationError) {
      return res.status(400).json(body('VALIDATION_FAILED', error.message, error.details));
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json(body('NOT_FOUND', error.message));
    }

    if (error instanceof ConflictError) {
      // 409, not 400. The request was well-formed; it conflicts with state.
      return res.status(409).json(body('CONFLICT', error.message, error.details));
    }

    // express.json() sets `status` on its own errors: 400 for malformed JSON,
    // 413 for a body over the limit. Honour them rather than returning 500.
    const status = (error as { status?: number; statusCode?: number })?.status ??
      (error as { statusCode?: number })?.statusCode;

    if (typeof status === 'number' && status < 500) {
      return res.status(status).json(body('BAD_REQUEST', (error as Error).message));
    }

    // --- Anything else is OUR bug -----------------------------------------

    logger.error(
      JSON.stringify({
        level: 'error',
        requestId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
    );

    const payload = body('INTERNAL_ERROR', 'An unexpected error occurred');
    if (exposeStack && error instanceof Error) {
      (payload.error as ErrorBody['error'] & { stack?: string }).stack = error.stack;
    }
    return res.status(500).json(payload);

    function body(code: string, message: string, details?: Record<string, string>): ErrorBody {
      return { error: { code, message, ...(details && { details }), ...(requestId && { requestId }) } };
    }
  };
}

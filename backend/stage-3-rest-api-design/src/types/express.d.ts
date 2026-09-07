/**
 * DECLARATION MERGING.
 *
 * Middleware routinely attaches things to `req` - a request id, the current
 * user, a tenant. TypeScript does not know about them, and the usual workaround
 * is a cast at every single use site:
 *
 *   (req as { id?: string }).id      // noisy, and unchecked
 *
 * Instead, tell TypeScript once. `declare module` REOPENS the type that
 * `@types/express` already declared and adds fields to it. Every `req.id` in
 * the codebase is then typed, with no casts anywhere.
 *
 * The rule of thumb: mark these OPTIONAL unless the middleware that sets them
 * runs before literally everything (including the 404 handler and error
 * handler). `id` here is set by the very first middleware, so it is safe as
 * required; `user` in Stage 6 is genuinely optional because unauthenticated
 * requests exist.
 */
declare global {
  namespace Express {
    interface Request {
      /** Set by the request-id middleware in `http/app.ts`. */
      id: string;
    }
  }
}

export {};

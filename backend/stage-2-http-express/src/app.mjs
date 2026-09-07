import express from 'express';
import { randomUUID } from 'node:crypto';

/**
 * The same API as rawServer.mjs, in Express.
 *
 * The app is built by a FUNCTION and exported without calling `listen`. That
 * separation is what makes it testable: a test can drive the app in-process
 * with supertest, with no port to bind and no server to clean up. See
 * `app.test.mjs`.
 */

// --- Domain errors ---------------------------------------------------------

/**
 * One error class carrying an HTTP status.
 *
 * The alternative - returning `res.status(404).json(...)` from deep inside a
 * service - couples your business logic to HTTP. Throw a typed error, and let
 * ONE handler at the edge decide how it becomes a response.
 */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new HttpError(400, message, details);
  }
  static notFound(message = 'Resource not found') {
    return new HttpError(404, message);
  }
  static conflict(message) {
    return new HttpError(409, message);
  }
}

// --- Middleware ------------------------------------------------------------

/**
 * MIDDLEWARE IS THE WHOLE IDEA OF EXPRESS.
 *
 * A middleware is `(req, res, next) => void`. Requests flow through them in
 * REGISTRATION ORDER, and each either responds or calls `next()` to pass
 * control on. That is the entire model.
 *
 * This one gives every request an id and logs how long it took. Note that the
 * log is written on the response's `finish` event - you cannot know the status
 * or duration until the response is actually sent.
 */
export function requestLogger(logger = console) {
  return (req, res, next) => {
    // Honour an upstream id if a proxy or gateway set one, so a single trace id
    // follows a request across services.
    req.id = req.get('x-request-id') ?? randomUUID();
    res.setHeader('x-request-id', req.id);

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
      logger.log(
        JSON.stringify({
          // Structured logs, not string concatenation. A log aggregator can
          // filter and aggregate JSON; it cannot do much with prose.
          level: res.statusCode >= 500 ? 'error' : 'info',
          requestId: req.id,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Math.round(ms * 100) / 100,
        }),
      );
    });

    next();
  };
}

/**
 * A 404 handler.
 *
 * Registered AFTER all routes: if control reaches here, nothing matched. Order
 * is not a style choice in Express - it is the routing algorithm.
 */
export function notFoundHandler(req, _res, next) {
  next(HttpError.notFound(`Cannot ${req.method} ${req.path}`));
}

/**
 * THE ERROR HANDLER.
 *
 * Express identifies it by ARITY: four parameters means error handler. Drop
 * `next` and it silently becomes ordinary middleware that never runs - a
 * genuinely baffling bug, so the underscore is deliberate.
 *
 * Register it LAST.
 */
export function errorHandler({ logger = console, exposeStack = false } = {}) {
  return (error, req, res, _next) => {
    const status = error.status ?? 500;

    if (status >= 500) {
      logger.error(JSON.stringify({ level: 'error', requestId: req.id, message: error.message, stack: error.stack }));
    }

    /*
     * NEVER leak internals on a 5xx.
     *
     * A stack trace tells an attacker your directory layout, your dependency
     * versions and often your database schema. Log the detail; return a
     * generic message.
     */
    const body = {
      error: {
        message: status >= 500 ? 'Internal server error' : error.message,
        ...(error.details && { details: error.details }),
        requestId: req.id,
      },
    };

    if (exposeStack && status >= 500) body.error.stack = error.stack;

    res.status(status).json(body);
  };
}

// --- Routes ----------------------------------------------------------------

function buildTaskRoutes(store) {
  // A Router is a mini-app: its own middleware stack, mountable under a prefix.
  // It is how you keep `app.mjs` from becoming a thousand lines.
  const router = express.Router();

  router.get('/', (req, res) => {
    const { done } = req.query;
    const data = done === undefined ? store.all() : store.all().filter((t) => String(t.done) === done);
    res.json({ data });
  });

  router.get('/:id', (req, res) => {
    const task = store.byId(req.params.id);
    // Throwing from a handler is fine - Express routes it to the error handler.
    if (!task) throw HttpError.notFound(`No task with id ${req.params.id}`);
    res.json({ data: task });
  });

  router.post('/', (req, res) => {
    const { title } = req.body ?? {};

    if (typeof title !== 'string' || title.trim().length < 3) {
      throw HttpError.badRequest('Validation failed', { title: 'must be at least 3 characters' });
    }

    const task = store.add(title.trim());
    // 201 + Location is the correct answer to a successful POST.
    res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
  });

  router.delete('/:id', (req, res) => {
    if (!store.remove(req.params.id)) throw HttpError.notFound(`No task with id ${req.params.id}`);
    // 204 No Content: succeeded, and there is deliberately no body.
    res.status(204).end();
  });

  /**
   * An ASYNC handler that rejects.
   *
   * In Express 4 this hung the request forever, which is why every codebase had
   * an `asyncHandler(fn)` wrapper or `express-async-errors`.
   *
   * EXPRESS 5 FORWARDS REJECTED PROMISES TO THE ERROR HANDLER AUTOMATICALLY.
   * The wrapper is no longer needed - and the test asserts it.
   */
  router.get('/:id/slow', async (req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    const task = store.byId(req.params.id);
    if (!task) throw HttpError.notFound(`No task with id ${req.params.id}`);
    res.json({ data: task });
  });

  return router;
}

/** An in-memory store. Stage 5 replaces this with PostgreSQL. */
export function createTaskStore(seed = []) {
  let tasks = [...seed];
  let nextId = tasks.length + 1;

  return {
    all: () => tasks,
    byId: (id) => tasks.find((task) => task.id === id),
    add(title) {
      const task = { id: String(nextId++), title, done: false };
      tasks = [...tasks, task];
      return task;
    },
    remove(id) {
      const before = tasks.length;
      tasks = tasks.filter((task) => task.id !== id);
      return tasks.length < before;
    },
  };
}

// --- The app ---------------------------------------------------------------

/**
 * @param {object} [options]
 * @param {Console} [options.logger]
 * @param {boolean} [options.exposeStack] Include stack traces on 5xx. Dev only.
 * @param {Array}   [options.seed]
 * @param {(app: import('express').Express) => void} [options.registerExtraRoutes]
 *   A test seam. Routes registered here land BEFORE the 404 and error
 *   handlers, which is the only place a route can usefully go - see
 *   `app.test.mjs` for why registering one afterwards silently does nothing.
 */
export function createApp({ logger = console, exposeStack = false, seed = [], registerExtraRoutes } = {}) {
  const app = express();
  const store = createTaskStore(seed);

  /*
   * ORDER MATTERS. Reading top to bottom is reading the request's path through
   * the system.
   */

  // Do not advertise the framework. Free, and one less thing for a scanner.
  app.disable('x-powered-by');

  app.use(requestLogger(logger));

  /*
   * Body parsing is OPT-IN. Without this, `req.body` is undefined - the most
   * common "why is my POST body empty" question there is.
   *
   * The `limit` is a security control: it caps how much memory one request can
   * make you allocate.
   */
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  app.use('/api/tasks', buildTaskRoutes(store));

  registerExtraRoutes?.(app);

  // These two go last, in this order.
  app.use(notFoundHandler);
  app.use(errorHandler({ logger, exposeStack }));

  return app;
}

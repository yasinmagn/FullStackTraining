import express, { type Express } from 'express';
import { randomUUID } from 'node:crypto';
import { errorHandler, notFoundHandler } from './errorHandler.ts';
import { createTaskRouter } from './taskRoutes.ts';
import type { TaskService } from '../service/taskService.ts';

export interface AppOptions {
  taskService: TaskService;
  logger?: Pick<Console, 'log' | 'error'>;
  exposeStack?: boolean;
}

/**
 * COMPOSITION ROOT for the HTTP layer.
 *
 * Dependencies arrive as arguments - the app does not construct its own
 * service, and the service does not construct its own repository. Wiring
 * happens once, at the edge, in `server.ts`.
 *
 * That is what lets a test build the same app around an in-memory repository
 * with no database and no environment variables.
 */
export function createApp({ taskService, logger = console, exposeStack = false }: AppOptions): Express {
  const app = express();

  app.disable('x-powered-by');

  /*
   * `req.id` is typed, with no cast, because `src/types/express.d.ts` merges
   * the field into Express's own Request interface.
   */
  app.use((req, res, next) => {
    req.id = req.get('x-request-id') ?? randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });

  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  // Versioning in the path. `/api/v1/...` is the pragmatic choice: it is
  // visible in logs, easy to route at a proxy, and trivial to curl. Header
  // versioning is more RESTful in theory and more painful in practice.
  app.use('/api/tasks', createTaskRouter(taskService));

  app.use(notFoundHandler);
  app.use(errorHandler({ logger, exposeStack }));

  return app;
}

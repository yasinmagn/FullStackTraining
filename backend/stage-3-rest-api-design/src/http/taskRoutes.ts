import { Router } from 'express';
import { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from '../domain/task.ts';
import type { TaskService } from '../service/taskService.ts';

/**
 * THE HTTP LAYER.
 *
 * Its job is narrow and worth stating explicitly:
 *
 *   1. parse and validate the request (zod)
 *   2. call the service
 *   3. choose a status code and shape the response
 *
 * It contains NO business rules. If you find yourself writing an `if` about
 * what is *allowed* here, it belongs in the service.
 *
 * Handlers may throw: Express 5 forwards both synchronous throws and rejected
 * promises to the error handler, so there is no try/catch and no asyncHandler
 * wrapper anywhere in this file.
 */
export function createTaskRouter(service: TaskService): Router {
  const router = Router();

  /**
   * GET /api/tasks
   *
   * Filtering, sorting and pagination all go in the QUERY STRING - never in
   * the path. `/api/tasks?status=todo` is a filtered view of one collection;
   * `/api/tasks/todo` reads as a task whose id is "todo", and collides the
   * moment you add `/api/tasks/:id`.
   */
  router.get('/', async (req, res) => {
    // `.parse` throws a ZodError, which the error handler turns into a 400
    // listing every bad field. The parsed result is fully typed AND has
    // defaults applied, so the service never sees an unset page size.
    const query = listTasksQuerySchema.parse(req.query);
    const page = await service.list(query);

    res.json(page);
  });

  /**
   * GET /api/tasks/:id
   *
   * The service throws NotFoundError; the error handler makes it a 404. This
   * handler has no idea what a 404 is, which is the point.
   */
  router.get('/:id', async (req, res) => {
    const task = await service.getById(req.params.id);
    res.json({ data: task });
  });

  /**
   * POST /api/tasks
   *
   * 201 Created, plus a `Location` header pointing at the new resource. The
   * body is returned as well so the client does not need a second round trip
   * to learn the generated id and timestamps.
   */
  router.post('/', async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = await service.create(input);

    res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
  });

  /**
   * PATCH /api/tasks/:id - a PARTIAL update.
   *
   * PATCH, not PUT. PUT means "replace the whole resource", so a PUT that omits
   * `description` is asking you to clear it. Almost every API that says PUT
   * actually implements PATCH semantics, and then surprises someone.
   */
  router.patch('/:id', async (req, res) => {
    const changes = updateTaskSchema.parse(req.body);
    const task = await service.update(req.params.id, changes);

    res.json({ data: task });
  });

  /**
   * DELETE /api/tasks/:id
   *
   * 204 No Content: it worked and there is deliberately nothing to send.
   *
   * DELETE is idempotent, so a second call could reasonably also return 204.
   * We return 404 instead - more informative, and honest about what happened.
   * Either is defensible; what matters is that you decide and document it.
   */
  router.delete('/:id', async (req, res) => {
    await service.delete(req.params.id);
    res.status(204).end();
  });

  /**
   * Anything else on the collection is 405, with an `Allow` header.
   *
   * `router.all` after the specific methods catches "the path exists, the
   * method does not" - which is genuinely different information from 404.
   */
  router.all('/', (req, res) => {
    res.status(405).set('allow', 'GET, POST').json({
      error: { code: 'METHOD_NOT_ALLOWED', message: `${req.method} is not allowed on this collection` },
    });
  });

  router.all('/:id', (req, res) => {
    res.status(405).set('allow', 'GET, PATCH, DELETE').json({
      error: { code: 'METHOD_NOT_ALLOWED', message: `${req.method} is not allowed on this resource` },
    });
  });

  return router;
}

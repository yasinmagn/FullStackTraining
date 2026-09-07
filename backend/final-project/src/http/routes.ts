import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createTaskSchema,
  listTasksQuerySchema,
  loginSchema,
  registerSchema,
  updateTaskSchema,
} from '../domain/index.ts';
import { requireAuth } from './middleware.ts';
import type { AuthService } from '../service/authService.ts';
import type { TaskService } from '../service/taskService.ts';

/**
 * THE HTTP LAYER.
 *
 * Parse the request, call a service, choose a status code. No business rules,
 * no SQL, and no try/catch - Express 5 forwards both thrown errors and rejected
 * promises to the error handler.
 */

/**
 * A tight limit on the auth endpoints specifically.
 *
 * Without it an attacker gets unlimited guesses against every account. bcrypt
 * makes each guess slow, but "slow x unlimited" is still a compromise - and
 * each attempt costs YOU ~200ms of CPU, so it is also a denial of service you
 * are paying for.
 *
 * `skipSuccessfulRequests` means a legitimate user is never locked out by their
 * own activity.
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } },
});

export function createAuthRouter(auth: AuthService, enableRateLimit = true): Router {
  const router = Router();
  const limiter = enableRateLimit ? [authRateLimit] : [];

  router.post('/register', ...limiter, async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await auth.register(input);

    req.log.info('user.registered', { userId: result.user.id });
    res.status(201).json({ data: result });
  });

  router.post('/login', ...limiter, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await auth.login(input);

    req.log.info('user.loggedIn', { userId: result.user.id });
    res.json({ data: result });
  });

  router.get('/me', requireAuth(auth), async (req, res) => {
    // `req.user!` is safe ONLY because requireAuth ran - which is exactly why
    // the type declares it optional.
    res.json({ data: await auth.getUser(req.user!.sub) });
  });

  return router;
}

export function createTaskRouter(tasks: TaskService, auth: AuthService): Router {
  const router = Router();

  /*
   * Applied at the ROUTER level, so a route added later is authenticated by
   * default. You have to opt out deliberately rather than remember to opt in.
   */
  router.use(requireAuth(auth));

  router.get('/', async (req, res) => {
    const query = listTasksQuerySchema.parse(req.query);
    // The owner comes from the TOKEN. There is no way to ask for someone
    // else's tasks, because there is no parameter for it.
    res.json(await tasks.list(req.user!.sub, query));
  });

  router.get('/stats', async (req, res) => {
    res.json({ data: await tasks.stats(req.user!.sub) });
  });

  router.post('/', async (req, res) => {
    // The schema has no ownerId/status/id field, so zod strips them if sent.
    const input = createTaskSchema.parse(req.body);
    const task = await tasks.create(req.user!.sub, input);

    req.log.info('task.created', { taskId: task.id });
    res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
  });

  /*
   * `/stats` is registered BEFORE `/:id`, and that order matters: Express
   * matches in registration order, so with them swapped a request for /stats
   * would be handled as a task whose id is "stats".
   */
  router.get('/:id', async (req, res) => {
    // Throws NotFoundError for a missing task AND for someone else's - the two
    // are deliberately indistinguishable, so ids cannot be enumerated.
    res.json({ data: await tasks.getById(req.user!.sub, req.params.id) });
  });

  router.patch('/:id', async (req, res) => {
    const changes = updateTaskSchema.parse(req.body);
    const task = await tasks.update(req.user!.sub, req.params.id, changes);

    req.log.info('task.updated', { taskId: task.id, fields: Object.keys(changes) });
    res.json({ data: task });
  });

  router.delete('/:id', async (req, res) => {
    await tasks.delete(req.user!.sub, req.params.id);

    req.log.info('task.deleted', { taskId: req.params.id });
    res.status(204).end();
  });

  // "The path exists, the method does not" is different information from 404.
  router.all('/', (req, res) => {
    res.status(405).set('allow', 'GET, POST').json({
      error: { code: 'METHOD_NOT_ALLOWED', message: `${req.method} is not allowed here` },
    });
  });

  router.all('/:id', (req, res) => {
    res.status(405).set('allow', 'GET, PATCH, DELETE').json({
      error: { code: 'METHOD_NOT_ALLOWED', message: `${req.method} is not allowed here` },
    });
  });

  return router;
}

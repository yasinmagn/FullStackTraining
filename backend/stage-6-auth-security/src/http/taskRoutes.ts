import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { requireAuth, requireRole } from '../auth/middleware.ts';
import { NotFoundError } from '../domain/errors.ts';
import { ForbiddenError } from '../domain/authErrors.ts';
import type { TokenConfig } from '../auth/tokens.ts';

/**
 * Task routes, now OWNED BY USERS.
 *
 * This is where broken access control lives or dies. Read the two approaches
 * in `GET /` and `GET /:id` and note which one is harder to get wrong.
 */

export interface OwnedTask {
  id: string;
  ownerId: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  createdAt: string;
}

export interface TaskStore {
  listForOwner(ownerId: string): Promise<OwnedTask[]>;
  listAll(): Promise<OwnedTask[]>;
  findById(id: string): Promise<OwnedTask | undefined>;
  create(input: Omit<OwnedTask, 'id' | 'createdAt'>): Promise<OwnedTask>;
  delete(id: string): Promise<boolean>;
}

export function createInMemoryTaskStore(seed: OwnedTask[] = []): TaskStore {
  const tasks = new Map(seed.map((task) => [task.id, task]));

  return {
    async listForOwner(ownerId) {
      return [...tasks.values()].filter((task) => task.ownerId === ownerId);
    },
    async listAll() {
      return [...tasks.values()];
    },
    async findById(id) {
      return tasks.get(id);
    },
    async create(input) {
      const task: OwnedTask = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
      tasks.set(task.id, task);
      return task;
    },
    async delete(id) {
      return tasks.delete(id);
    },
  };
}

const createTaskSchema = z.object({
  title: z.string().trim().min(3).max(200),
  /*
   * NOTE WHAT IS ABSENT: `ownerId`.
   *
   * If the schema accepted an ownerId, a client could create tasks belonging to
   * someone else - or, worse, on an update route, reassign ownership away from
   * themselves. The server takes the owner from the TOKEN, never from the body.
   *
   * The general rule: any field that decides WHO YOU ARE or WHAT YOU MAY DO
   * must come from the session, never from user input.
   */
});

export function createTaskRouter(store: TaskStore, tokens: TokenConfig): Router {
  const router = Router();

  // Every route below requires authentication. Applying it at the ROUTER level
  // rather than per route means a new route is secure by default - you have to
  // opt out deliberately, rather than remembering to opt in.
  router.use(requireAuth(tokens));

  /**
   * SCOPE THE QUERY. This is the approach to prefer.
   *
   * `listForOwner(req.user.sub)` cannot return someone else's task, because the
   * data never leaves the store. There is no check to forget, and the next
   * person to edit this route cannot accidentally remove one.
   */
  router.get('/', async (req, res) => {
    const tasks = await store.listForOwner(req.user!.sub);
    res.json({ data: tasks });
  });

  /**
   * FETCH-THEN-CHECK. Necessary when you look something up by id, and the
   * pattern to be careful with.
   */
  router.get('/:id', async (req, res) => {
    const task = await store.findById(req.params.id);

    /*
     * 404 for someone else's task, NOT 403.
     *
     * A 403 confirms the id exists, letting an attacker enumerate valid ids by
     * watching which ones return 403 instead of 404. To someone with no right
     * to see a resource, "forbidden" and "does not exist" should be
     * indistinguishable.
     *
     * The classic IDOR bug is this route WITHOUT the ownership clause: auth
     * passed, so it feels done, and every logged-in user can read every task.
     * It passes testing perfectly, because you test as the owner.
     */
    if (!task || (task.ownerId !== req.user!.sub && req.user!.role !== 'admin')) {
      throw new NotFoundError('Task', req.params.id);
    }

    res.json({ data: task });
  });

  router.post('/', async (req, res) => {
    const input = createTaskSchema.parse(req.body);

    const task = await store.create({
      title: input.title,
      status: 'todo',
      ownerId: req.user!.sub, // from the TOKEN, never from the body
    });

    res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
  });

  router.delete('/:id', async (req, res) => {
    const task = await store.findById(req.params.id);

    if (!task || (task.ownerId !== req.user!.sub && req.user!.role !== 'admin')) {
      throw new NotFoundError('Task', req.params.id);
    }

    await store.delete(req.params.id);
    res.status(204).end();
  });

  /**
   * An admin-only route.
   *
   * `requireRole` is AUTHORISATION (403). The router-level `requireAuth` above
   * already handled authentication (401), so the two stay distinct.
   */
  router.get('/admin/all', requireRole('admin'), async (_req, res) => {
    res.json({ data: await store.listAll() });
  });

  return router;
}

export { ForbiddenError };

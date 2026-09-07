/**
 * A fake HTTP API, in memory.
 *
 * This stage is about the CLIENT side of data fetching, so the server is
 * simulated - no backend to start, and, more usefully, latency and failures we
 * can turn on at will. Every method behaves like a real endpoint: it is slow,
 * it can fail, and it throws typed errors with HTTP statuses.
 *
 * The final project replaces this module with real `fetch` calls against the
 * PostgreSQL-backed API you build in the backend track. Nothing above this
 * layer has to change - that is the point of keeping it behind one interface.
 */

import { taskListSchema, taskSchema, type CreateTaskInput, type Task, type TaskStatus } from './schemas.ts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Knobs the UI exposes so you can watch retries and error states for real. */
export const chaos = {
  latencyMs: 400,
  /** Probability that a READ fails with a 503. */
  readFailureRate: 0,
  /** Probability that a WRITE fails with a 500. */
  writeFailureRate: 0,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let nextId = 4;
let db: Task[] = [
  {
    id: '1',
    title: 'Learn TanStack Query',
    description: 'Queries, mutations, invalidation.',
    priority: 'high',
    status: 'in_progress',
    dueDate: '2026-02-01',
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-03T09:00:00.000Z',
  },
  {
    id: '2',
    title: 'Handle loading and error states',
    description: null,
    priority: 'medium',
    status: 'todo',
    dueDate: null,
    createdAt: '2026-01-02T09:00:00.000Z',
    updatedAt: '2026-01-02T09:00:00.000Z',
  },
  {
    id: '3',
    title: 'Write an optimistic update with rollback',
    description: 'Then break the server and watch it roll back.',
    priority: 'high',
    status: 'done',
    dueDate: '2026-01-20',
    createdAt: '2026-01-03T09:00:00.000Z',
    updatedAt: '2026-01-04T09:00:00.000Z',
  },
];

async function simulate(failureRate: number, status: number, message: string) {
  await sleep(chaos.latencyMs);
  if (Math.random() < failureRate) throw new ApiError(status, message);
}

export interface ListParams {
  status?: TaskStatus | 'all';
  query?: string;
  page?: number;
  pageSize?: number;
}

export const fakeApi = {
  async listTasks(params: ListParams = {}) {
    await simulate(chaos.readFailureRate, 503, 'The task service is unavailable');

    const { status = 'all', query = '', page = 1, pageSize = 10 } = params;
    const needle = query.trim().toLowerCase();

    const matching = db.filter((task) => {
      const statusOk = status === 'all' || task.status === status;
      const queryOk = needle === '' || task.title.toLowerCase().includes(needle);
      return statusOk && queryOk;
    });

    const start = (page - 1) * pageSize;
    const body = {
      data: matching.slice(start, start + pageSize),
      meta: { total: matching.length, page, pageSize },
    };

    // Validate on the way OUT too. In the real app this is the boundary where
    // a server-side change (a renamed field, a null you did not expect) is
    // caught loudly here rather than as `undefined` deep inside a component.
    return taskListSchema.parse(body);
  },

  async createTask(input: CreateTaskInput): Promise<Task> {
    await simulate(chaos.writeFailureRate, 500, 'Could not save the task');

    // Server-side validation, deliberately DIFFERENT from the client's rules.
    // Client validation is a convenience for the user; the server is the
    // authority, and the UI has to be able to render its errors.
    if (db.some((task) => task.title.toLowerCase() === input.title.toLowerCase())) {
      throw new ApiError(409, 'A task with that title already exists', {
        title: 'A task with that title already exists',
      });
    }

    const now = new Date().toISOString();
    const task: Task = {
      id: String(nextId++),
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: 'todo',
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now,
    };

    db = [task, ...db];
    return taskSchema.parse(task);
  },

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    await simulate(chaos.writeFailureRate, 500, 'Could not update the task');

    const existing = db.find((task) => task.id === id);
    if (!existing) throw new ApiError(404, 'Task not found');

    const updated: Task = { ...existing, status, updatedAt: new Date().toISOString() };
    db = db.map((task) => (task.id === id ? updated : task));
    return updated;
  },

  async deleteTask(id: string): Promise<void> {
    await simulate(chaos.writeFailureRate, 500, 'Could not delete the task');

    if (!db.some((task) => task.id === id)) throw new ApiError(404, 'Task not found');
    db = db.filter((task) => task.id !== id);
  },
};

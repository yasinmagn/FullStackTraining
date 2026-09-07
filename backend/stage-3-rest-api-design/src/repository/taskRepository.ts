import { randomUUID } from 'node:crypto';
import type { ListTasksQuery, Page, Priority, Task } from '../domain/task.ts';

/**
 * THE REPOSITORY INTERFACE.
 *
 * This is the seam between "what the application needs" and "where the data
 * happens to live". The service depends on this interface; it never imports
 * `pg`, and it has no idea whether rows come from memory, PostgreSQL or an
 * HTTP call to another service.
 *
 * Two things that buys you, both of which pay off within weeks:
 *   1. Stage 5 swaps in a PostgreSQL implementation and the service does not
 *      change by a single line.
 *   2. Service tests run against the in-memory version - no database, no
 *      Docker, milliseconds per test.
 *
 * Note that every method is async even though the in-memory version is
 * synchronous. The interface has to be shaped for the SLOWEST implementation,
 * or swapping in a real database becomes a breaking change everywhere.
 */
export interface TaskRepository {
  list(query: ListTasksQuery): Promise<Page<Task>>;
  findById(id: string): Promise<Task | null>;
  findByTitle(title: string): Promise<Task | null>;
  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(id: string, changes: Partial<Task>): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const satisfies Record<Priority, number>;

/**
 * An in-memory implementation.
 *
 * Deliberately complete - filtering, sorting and pagination all work - so the
 * service and route tests exercise real behaviour rather than a stub that
 * always returns everything.
 */
export function createInMemoryTaskRepository(seed: readonly Task[] = []): TaskRepository {
  let tasks: Task[] = [...seed];

  return {
    async list(query) {
      const needle = query.q?.toLowerCase();

      const matching = tasks.filter((task) => {
        if (query.status && task.status !== query.status) return false;
        if (query.priority && task.priority !== query.priority) return false;
        if (needle && !task.title.toLowerCase().includes(needle)) return false;
        return true;
      });

      const direction = query.order === 'asc' ? 1 : -1;
      const sorted = matching.toSorted((a, b) => {
        switch (query.sort) {
          case 'title':
            return direction * a.title.localeCompare(b.title);
          case 'priority':
            return direction * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
          case 'dueDate':
            // Nulls sort LAST regardless of direction. "No due date" is not
            // "due in 1970", and letting it sort as the empty string produces
            // a list nobody can read.
            if (a.dueDate === null && b.dueDate === null) return 0;
            if (a.dueDate === null) return 1;
            if (b.dueDate === null) return -1;
            return direction * a.dueDate.localeCompare(b.dueDate);
          case 'createdAt':
          default:
            return direction * a.createdAt.localeCompare(b.createdAt);
        }
      });

      /*
       * `total` is the count BEFORE pagination but AFTER filtering. Getting
       * this wrong - counting the page instead of the result set - breaks
       * every pager in every client.
       */
      const total = sorted.length;
      const start = (query.page - 1) * query.pageSize;

      return {
        data: sorted.slice(start, start + query.pageSize),
        meta: {
          total,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
      };
    },

    async findById(id) {
      return tasks.find((task) => task.id === id) ?? null;
    },

    async findByTitle(title) {
      const needle = title.trim().toLowerCase();
      return tasks.find((task) => task.title.toLowerCase() === needle) ?? null;
    },

    async create(input) {
      const now = new Date().toISOString();
      const task: Task = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
      tasks = [...tasks, task];
      return task;
    },

    async update(id, changes) {
      const existing = tasks.find((task) => task.id === id);
      if (!existing) return null;

      const updated: Task = { ...existing, ...changes, id, updatedAt: new Date().toISOString() };
      tasks = tasks.map((task) => (task.id === id ? updated : task));
      return updated;
    },

    async delete(id) {
      const before = tasks.length;
      tasks = tasks.filter((task) => task.id !== id);
      return tasks.length < before;
    },
  };
}

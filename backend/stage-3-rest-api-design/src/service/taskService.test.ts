import { beforeEach, describe, expect, it } from 'vitest';
import { createInMemoryTaskRepository, type TaskRepository } from '../repository/taskRepository.ts';
import { createTaskService, type TaskService } from './taskService.ts';
import { ConflictError, NotFoundError } from '../domain/errors.ts';
import { listTasksQuerySchema, type Task } from '../domain/task.ts';

/**
 * SERVICE TESTS - no HTTP, no database, no framework.
 *
 * This is what the layering bought us. The service takes a repository
 * INTERFACE, so the test hands it an in-memory one and the whole suite runs in
 * milliseconds. Every business rule is covered here; the HTTP tests then only
 * have to check the translation to status codes.
 */

const task = (over: Partial<Task> = {}): Task => ({
  id: over.id ?? 'seed-1',
  title: 'Seeded task',
  description: null,
  priority: 'medium',
  status: 'todo',
  dueDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const query = (over: Record<string, unknown> = {}) => listTasksQuerySchema.parse(over);

let repository: TaskRepository;
let service: TaskService;

beforeEach(() => {
  repository = createInMemoryTaskRepository([
    task({ id: 'a', title: 'Alpha', priority: 'high', status: 'todo', dueDate: '2026-03-01', createdAt: '2026-01-01T00:00:00.000Z' }),
    task({ id: 'b', title: 'Bravo', priority: 'low', status: 'done', dueDate: null, createdAt: '2026-01-02T00:00:00.000Z' }),
    task({ id: 'c', title: 'Charlie', priority: 'medium', status: 'in_progress', dueDate: '2026-02-01', createdAt: '2026-01-03T00:00:00.000Z' }),
  ]);
  service = createTaskService(repository);
});

describe('list', () => {
  it('returns newest first by default', async () => {
    const page = await service.list(query());
    expect(page.data.map((t) => t.id)).toEqual(['c', 'b', 'a']);
  });

  it('filters by status', async () => {
    const page = await service.list(query({ status: 'done' }));
    expect(page.data.map((t) => t.id)).toEqual(['b']);
  });

  it('combines filters', async () => {
    const page = await service.list(query({ status: 'todo', priority: 'high' }));
    expect(page.data.map((t) => t.id)).toEqual(['a']);
  });

  it('searches case-insensitively', async () => {
    const page = await service.list(query({ q: 'BRAV' }));
    expect(page.data.map((t) => t.id)).toEqual(['b']);
  });

  it('sorts nulls last when sorting by dueDate', async () => {
    // "No due date" is not "due in 1970". Bravo has none, so it goes last in
    // BOTH directions.
    const asc = await service.list(query({ sort: 'dueDate', order: 'asc' }));
    expect(asc.data.map((t) => t.id)).toEqual(['c', 'a', 'b']);

    const desc = await service.list(query({ sort: 'dueDate', order: 'desc' }));
    expect(desc.data.map((t) => t.id)).toEqual(['a', 'c', 'b']);
  });

  it('reports total AFTER filtering but BEFORE pagination', async () => {
    const page = await service.list(query({ pageSize: 2, page: 1 }));

    expect(page.data).toHaveLength(2);
    // Counting the page instead of the result set breaks every client pager.
    expect(page.meta).toEqual({ total: 3, page: 1, pageSize: 2, totalPages: 2 });
  });

  it('returns an empty page past the end rather than erroring', async () => {
    const page = await service.list(query({ page: 99 }));
    expect(page.data).toEqual([]);
    expect(page.meta.total).toBe(3);
  });
});

describe('getById', () => {
  it('returns the task', async () => {
    expect((await service.getById('a')).title).toBe('Alpha');
  });

  it('throws NotFoundError, so callers never need a null check', async () => {
    // The repository's findById returns null; the service throws. `find*` may
    // miss, `get*` must not.
    await expect(service.getById('nope')).rejects.toThrow(NotFoundError);
    await expect(service.getById('nope')).rejects.toThrow('Task nope was not found');
  });
});

describe('create', () => {
  it('creates a task with server-controlled fields', async () => {
    const created = await service.create({
      title: 'Delta',
      description: null,
      priority: 'high',
      dueDate: null,
    });

    // The client does not get to choose the id, the timestamps or the initial
    // status. Those are the server's to decide.
    expect(created.status).toBe('todo');
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.createdAt).toBe(created.updatedAt);
  });

  it('rejects a duplicate title with ConflictError', async () => {
    // A BUSINESS rule, not a schema rule: zod can check the shape of a title,
    // only the service can know whether it is taken.
    await expect(
      service.create({ title: 'Alpha', description: null, priority: 'low', dueDate: null }),
    ).rejects.toThrow(ConflictError);
  });

  it('treats titles as case-insensitive for uniqueness', async () => {
    await expect(
      service.create({ title: 'alpha', description: null, priority: 'low', dueDate: null }),
    ).rejects.toThrow(ConflictError);
  });
});

describe('update', () => {
  it('applies a partial change and bumps updatedAt', async () => {
    const before = await service.getById('a');
    const updated = await service.update('a', { priority: 'low' });

    expect(updated.priority).toBe('low');
    expect(updated.title).toBe('Alpha'); // untouched fields survive
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(before.updatedAt));
  });

  it('rejects an invalid status transition with ConflictError', async () => {
    // 'b' is done. done -> in_progress must go via todo.
    await expect(service.update('b', { status: 'in_progress' })).rejects.toThrow(
      'Cannot move a task from done to in_progress',
    );
  });

  it('allows a legal transition', async () => {
    expect((await service.update('b', { status: 'todo' })).status).toBe('todo');
  });

  it('allows renaming a task to its own current title', async () => {
    // The duplicate check must exclude the task being updated, or a no-op
    // PATCH becomes a 409.
    expect((await service.update('a', { title: 'Alpha' })).title).toBe('Alpha');
  });

  it('rejects renaming onto another task title', async () => {
    await expect(service.update('a', { title: 'Bravo' })).rejects.toThrow(ConflictError);
  });

  it('throws NotFoundError for an unknown id', async () => {
    await expect(service.update('nope', { priority: 'low' })).rejects.toThrow(NotFoundError);
  });
});

describe('delete', () => {
  it('removes the task', async () => {
    await service.delete('a');
    await expect(service.getById('a')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when there was nothing to delete', async () => {
    await expect(service.delete('nope')).rejects.toThrow(NotFoundError);
  });
});

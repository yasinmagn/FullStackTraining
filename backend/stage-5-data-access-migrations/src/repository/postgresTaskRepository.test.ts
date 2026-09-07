import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import { createPool, withTransaction } from '../db/pool.ts';
import { migrateUp } from '../db/migrator.ts';
import { createPostgresTaskRepository, type TaskRepository } from './postgresTaskRepository.ts';
import { ConflictError } from '../domain/errors.ts';
import { listTasksQuerySchema } from '../domain/task.ts';

/**
 * INTEGRATION TESTS, against a real PostgreSQL.
 *
 * These deliberately do NOT mock `pg`. A mocked database proves your mock
 * matches your expectations, which is exactly the thing that was never in
 * doubt. It cannot tell you that a constraint fires, that a UUID cast fails,
 * that your ORDER BY is valid SQL, or that a unique index is case-insensitive -
 * and those are the bugs.
 *
 * They require TEST_DATABASE_URL and DELIBERATELY DO NOT fall back to
 * DATABASE_URL.
 *
 * `beforeEach` runs `TRUNCATE tasks`. If this suite fell back to DATABASE_URL,
 * running `npm test` on a machine configured for development would wipe the
 * developer's real data - and on a machine configured for production, worse.
 * A destructive test suite must name its target explicitly; there is no safe
 * default.
 *
 * If TEST_DATABASE_URL is unset the suite SKIPS rather than fails, so
 * `npm test` at the repo root stays green for someone who has not set up a
 * test database yet.
 *
 *   createdb fullstack_training_test
 *   # then in .env:
 *   TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fullstack_training_test
 */

const connectionString = process.env.TEST_DATABASE_URL;
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations');

const query = (over: Record<string, unknown> = {}) => listTasksQuerySchema.parse(over);

const input = (over: Partial<Parameters<TaskRepository['create']>[0]> = {}) => ({
  title: 'A task',
  description: null,
  priority: 'medium' as const,
  status: 'todo' as const,
  dueDate: null,
  ...over,
});

describe.skipIf(!connectionString)('PostgresTaskRepository', () => {
  let pool: Pool;
  let repository: TaskRepository;

  beforeAll(async () => {
    pool = createPool({ connectionString });
    // Migrate the test database from scratch. The test suite uses the SAME
    // migrations as production - if a migration is broken, these tests fail
    // rather than production doing so.
    await migrateUp(pool, migrationsDir, { log: () => {} });
  }, 30_000);

  afterAll(async () => {
    // Without this the pool holds the event loop open and vitest hangs.
    await pool?.end();
  });

  beforeEach(async () => {
    /*
     * TRUNCATE, not DELETE: far faster, and it resets sequences.
     *
     * Every test starts from a known empty state. Tests that depend on data
     * left by an earlier test pass in one order and fail in another, which is
     * the definition of a flaky suite.
     */
    await pool.query('TRUNCATE tasks RESTART IDENTITY CASCADE');
    repository = createPostgresTaskRepository(pool);
  });

  describe('create', () => {
    it('returns the row the database generated', async () => {
      const task = await repository.create(input({ title: 'Write a migration' }));

      // id and timestamps come back in the same round trip, via RETURNING *.
      expect(task.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(task.title).toBe('Write a migration');
      expect(task.createdAt).toBe(task.updatedAt);
    });

    it('applies database defaults', async () => {
      const task = await repository.create(input({ priority: 'medium', status: 'todo' }));
      expect(task).toMatchObject({ priority: 'medium', status: 'todo' });
    });

    it('translates a unique violation into a ConflictError, not a 500', async () => {
      await repository.create(input({ title: 'Duplicate me' }));

      // SQLSTATE 23505 -> ConflictError -> 409. Under concurrency the database
      // constraint is the ONLY check that holds, so this translation matters.
      await expect(repository.create(input({ title: 'Duplicate me' }))).rejects.toThrow(ConflictError);
    });

    it('enforces case-insensitive uniqueness via the functional index', async () => {
      await repository.create(input({ title: 'Case Test' }));
      await expect(repository.create(input({ title: 'case test' }))).rejects.toThrow(ConflictError);
    });

    it('rejects a blank title with a database CHECK', async () => {
      // The constraint fires even though nothing in JavaScript checked it.
      await expect(repository.create(input({ title: '   ' }))).rejects.toThrow();
    });

    it('round-trips a due date without shifting the day', async () => {
      // A DATE column comes back as a Date at LOCAL midnight. Formatting it
      // with toISOString() would move it to the previous day west of UTC.
      const task = await repository.create(input({ title: 'Due dated', dueDate: '2026-03-01' }));
      expect(task.dueDate).toBe('2026-03-01');
    });
  });

  describe('findById', () => {
    it('finds a task', async () => {
      const created = await repository.create(input({ title: 'Findable' }));
      expect((await repository.findById(created.id))?.title).toBe('Findable');
    });

    it('returns null for an unknown but valid uuid', async () => {
      expect(await repository.findById('00000000-0000-4000-8000-000000000000')).toBeNull();
    });

    it('returns null for a malformed id instead of throwing 22P02', async () => {
      // Passing 'not-a-uuid' straight to PostgreSQL raises
      // invalid_text_representation, which would surface as a 500. To a client,
      // "not a valid id" and "no such id" are the same thing.
      expect(await repository.findById('not-a-uuid')).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await repository.create(input({ title: 'Alpha', priority: 'high', status: 'todo', dueDate: '2026-03-01' }));
      await repository.create(input({ title: 'Bravo', priority: 'low', status: 'done' }));
      await repository.create(input({ title: 'Charlie', priority: 'medium', status: 'in_progress', dueDate: '2026-02-01' }));
    });

    it('filters by status', async () => {
      const page = await repository.list(query({ status: 'done' }));
      expect(page.data.map((t) => t.title)).toEqual(['Bravo']);
      expect(page.meta.total).toBe(1);
    });

    it('searches case-insensitively with ILIKE', async () => {
      const page = await repository.list(query({ q: 'BRAV' }));
      expect(page.data.map((t) => t.title)).toEqual(['Bravo']);
    });

    it('is not vulnerable to SQL injection through the search term', async () => {
      // If `q` were concatenated into the SQL, this would drop the table.
      // Parameterised, it is just a string that matches nothing.
      const page = await repository.list(query({ q: "'; DROP TABLE tasks; --" }));
      expect(page.data).toEqual([]);

      // Prove the table is still there.
      expect((await repository.list(query())).meta.total).toBe(3);
    });

    it('sorts by priority meaningfully, not alphabetically', async () => {
      // As text, 'high' < 'low' < 'medium'. The CASE expression sorts by what
      // priority MEANS.
      const page = await repository.list(query({ sort: 'priority', order: 'asc' }));
      expect(page.data.map((t) => t.priority)).toEqual(['high', 'medium', 'low']);
    });

    it('sorts nulls last', async () => {
      const page = await repository.list(query({ sort: 'dueDate', order: 'asc' }));
      // Bravo has no due date, so it goes last rather than first.
      expect(page.data.map((t) => t.title)).toEqual(['Charlie', 'Alpha', 'Bravo']);
    });

    it('paginates, reporting the total across the whole result set', async () => {
      const page = await repository.list(query({ pageSize: 2, page: 1, sort: 'title', order: 'asc' }));

      expect(page.data.map((t) => t.title)).toEqual(['Alpha', 'Bravo']);
      // count(*) OVER () gives the pre-LIMIT total in the SAME query - no
      // second round trip, and no chance of the two disagreeing.
      expect(page.meta).toEqual({ total: 3, page: 1, pageSize: 2, totalPages: 2 });
    });

    it('returns total 0 for an empty result rather than undefined', async () => {
      // With zero rows the window function has nothing to attach a count to.
      const page = await repository.list(query({ q: 'nothing matches this' }));
      expect(page.meta.total).toBe(0);
      expect(page.meta.totalPages).toBe(1);
    });
  });

  describe('update', () => {
    it('changes only the fields provided', async () => {
      const created = await repository.create(input({ title: 'Original', description: 'Keep me' }));
      const updated = await repository.update(created.id, { priority: 'high' });

      expect(updated).toMatchObject({ priority: 'high', title: 'Original', description: 'Keep me' });
    });

    it('lets the TRIGGER maintain updated_at', async () => {
      const created = await repository.create(input({ title: 'Trigger test' }));
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.update(created.id, { status: 'in_progress' });

      // Nothing in the UPDATE statement sets updated_at - migration 003 does,
      // which means a manual UPDATE from psql gets it right too.
      expect(Date.parse(updated!.updatedAt)).toBeGreaterThan(Date.parse(created.updatedAt));
    });

    it('returns null for an unknown id', async () => {
      expect(await repository.update('00000000-0000-4000-8000-000000000000', { priority: 'low' })).toBeNull();
    });

    it('translates a duplicate title on rename into ConflictError', async () => {
      await repository.create(input({ title: 'Taken' }));
      const other = await repository.create(input({ title: 'Free' }));

      await expect(repository.update(other.id, { title: 'Taken' })).rejects.toThrow(ConflictError);
    });
  });

  describe('delete', () => {
    it('reports whether anything was actually deleted', async () => {
      const created = await repository.create(input({ title: 'Delete me' }));

      // rowCount is the difference between "deleted" and "nothing matched".
      expect(await repository.delete(created.id)).toBe(true);
      expect(await repository.delete(created.id)).toBe(false);
    });
  });

  describe('transactions', () => {
    it('commits every write together', async () => {
      await withTransaction(pool, async (client) => {
        await repository.create(input({ title: 'First' }), client);
        await repository.create(input({ title: 'Second' }), client);
      });

      expect((await repository.list(query())).meta.total).toBe(2);
    });

    it('rolls EVERYTHING back when any statement fails', async () => {
      await repository.create(input({ title: 'Existing' }));

      await expect(
        withTransaction(pool, async (client) => {
          await repository.create(input({ title: 'Will be rolled back' }), client);
          // Violates the unique index -> the whole transaction unwinds.
          await repository.create(input({ title: 'Existing' }), client);
        }),
      ).rejects.toThrow(ConflictError);

      const page = await repository.list(query());
      expect(page.meta.total).toBe(1);
      expect(page.data[0]!.title).toBe('Existing');
    });

    it('does not leak connections when a transaction fails', async () => {
      // The `finally { client.release() }` in withTransaction is what makes
      // this pass. Without it, the pool would be exhausted long before 20
      // iterations and this test would hang rather than fail - which is
      // exactly how the bug presents in production.
      for (let i = 0; i < 20; i++) {
        await withTransaction(pool, async (client) => {
          await repository.create(input({ title: `Task ${i}` }), client);
        }).catch(() => {});
      }

      expect(pool.idleCount).toBeGreaterThan(0);
      expect(pool.waitingCount).toBe(0);
    });
  });
});

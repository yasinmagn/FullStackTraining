import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import type { Express } from 'express';
import { loadConfig, safeDatabaseUrl, type Config } from './config/index.ts';
import { createPool } from './db/pool.ts';
import { migrateUp } from './db/migrator.ts';
import { createTaskRepository } from './repository/taskRepository.ts';
import { createUserRepository } from './repository/userRepository.ts';
import { createTaskService } from './service/taskService.ts';
import { createAuthService } from './service/authService.ts';
import { createApp } from './http/app.ts';
import { createLogger } from './observability/logger.ts';

/**
 * END-TO-END API TESTS against a real PostgreSQL.
 *
 * Every layer is real: HTTP stack, services, repositories, database, migrations,
 * constraints, triggers. Nothing is mocked, because the bugs live in exactly
 * the places a mock would paper over - a constraint firing, a UUID cast, an
 * ORDER BY that is not valid SQL.
 *
 * SAFETY: these require TEST_DATABASE_URL and DELIBERATELY DO NOT fall back to
 * DATABASE_URL. `beforeEach` truncates. A fallback would mean `npm test` wipes
 * a developer's real data - or worse, on a machine pointed at production.
 * There is no safe default for a destructive suite.
 *
 *   createdb fullstack_training_test
 *   # .env
 *   TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fullstack_training_test
 *
 * When it is unset the suite SKIPS, so the repo-root `npm test` stays green for
 * someone who has not set a test database up yet.
 */

// loadConfig() also loads the repo-root .env as a side effect.
const baseConfig = (() => {
  try {
    return loadConfig({
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://placeholder/placeholder',
      JWT_SECRET: process.env.JWT_SECRET ?? 'a-test-only-secret-long-enough-to-pass-validation',
    });
  } catch {
    return null;
  }
})();

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const quietLogger = createLogger({ level: 'error', write: () => {} });

describe.skipIf(!testDatabaseUrl || !baseConfig)('Task API', () => {
  let pool: Pool;
  let app: Express;
  let config: Config;

  beforeAll(async () => {
    config = { ...baseConfig!, DATABASE_URL: testDatabaseUrl!, NODE_ENV: 'test', isProduction: false };
    pool = createPool(config);

    // The test database is migrated with the SAME migrations as production, so
    // a broken migration fails here rather than during a deploy.
    await migrateUp(pool, migrationsDir, { logger: { log: () => {} } });
  }, 30_000);

  afterAll(async () => {
    // Without this the pool holds the event loop open and vitest hangs.
    await pool?.end();
  });

  beforeEach(async () => {
    // CASCADE also clears tasks, via the foreign key. Every test starts from a
    // known empty state - tests that depend on a previous test's data pass in
    // one order and fail in another.
    await pool.query('TRUNCATE users CASCADE');

    const taskRepository = createTaskRepository(pool);
    const userRepository = createUserRepository(pool);

    app = createApp({
      config,
      authService: createAuthService(userRepository, config),
      taskService: createTaskService(taskRepository),
      logger: quietLogger,
      // The limiter is stateful across a whole file and would fail unrelated
      // tests once its window filled.
      enableRateLimit: false,
      healthChecks: [
        {
          name: 'database',
          critical: true,
          check: async () => {
            await pool.query('SELECT 1');
            return true;
          },
        },
      ],
    });
  });

  /** Register a user and return their bearer token. */
  async function signUp(email: string) {
    const response = await request(app)
      .post('/auth/register')
      .send({ email, displayName: email.split('@')[0], password: 'a-long-enough-password' })
      .expect(201);
    return {
      token: response.body.data.accessToken as string,
      userId: response.body.data.user.id as string,
    };
  }

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  // ===========================================================================
  describe('health', () => {
    it('liveness does not touch the database', async () => {
      await request(app).get('/health/live').expect(200);
    });

    it('readiness reports a real SELECT 1 against PostgreSQL', async () => {
      const response = await request(app).get('/health/ready').expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.checks.database.status).toBe('ok');
    });
  });

  // ===========================================================================
  describe('registration and login', () => {
    it('registers and returns a usable token', async () => {
      const { token } = await signUp('ada@example.com');
      await request(app).get('/api/tasks').set(auth(token)).expect(200);
    });

    it('never returns the password hash', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'ada@example.com', displayName: 'Ada', password: 'a-long-enough-password' })
        .expect(201);

      // An allow-list projection, so a column added later is private by default.
      expect(Object.keys(response.body.data.user).sort()).toEqual([
        'createdAt',
        'displayName',
        'email',
        'id',
        'role',
      ]);
    });

    it('stores a bcrypt hash, never the password', async () => {
      await signUp('ada@example.com');

      const { rows } = await pool.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE email = $1',
        ['ada@example.com'],
      );
      expect(rows[0]!.password_hash).toMatch(/^\$2[aby]\$12\$/);
      expect(rows[0]!.password_hash).not.toContain('a-long-enough-password');
    });

    it('rejects a duplicate email, case-insensitively', async () => {
      await signUp('ada@example.com');

      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'ADA@example.com', displayName: 'Impostor', password: 'a-long-enough-password' })
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('ignores a role supplied at registration', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'sneaky@example.com',
          displayName: 'Sneaky',
          password: 'a-long-enough-password',
          role: 'admin', // mass assignment attempt
        })
        .expect(201);

      const { rows } = await pool.query<{ role: string }>('SELECT role FROM users WHERE email = $1', [
        'sneaky@example.com',
      ]);
      expect(rows[0]!.role).toBe('user');
    });

    it('gives the same error for an unknown email and a wrong password', async () => {
      await signUp('ada@example.com');

      const unknown = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'a-long-enough-password' })
        .expect(401);
      const wrong = await request(app)
        .post('/auth/login')
        .send({ email: 'ada@example.com', password: 'wrong-password-here' })
        .expect(401);

      // Different messages would be a free account-existence oracle.
      expect(unknown.body.error.message).toBe('Invalid email or password');
      expect(wrong.body.error.message).toBe(unknown.body.error.message);
    });

    it('returns 401 with WWW-Authenticate when no token is sent', async () => {
      const response = await request(app).get('/api/tasks').expect(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
    });

    it('rejects a token signed with a different secret', async () => {
      // check-secrets:allow - a throwaway value for this test only
      const other = { ...config, JWT_SECRET: 'a-completely-different-secret-that-is-long' };
      const forged = createAuthService(createUserRepository(pool), other);
      const { accessToken } = await forged.register({
        email: 'forger@example.com',
        displayName: 'Forger',
        password: 'a-long-enough-password',
      });

      await request(app).get('/api/tasks').set(auth(accessToken)).expect(401);
    });
  });

  // ===========================================================================
  describe('tasks', () => {
    it('creates a task owned by the token holder', async () => {
      const { token, userId } = await signUp('ada@example.com');

      const response = await request(app)
        .post('/api/tasks')
        .set(auth(token))
        .send({ title: 'Ship the final project', priority: 'high', dueDate: '2026-04-01' })
        .expect(201);

      expect(response.headers.location).toBe(`/api/tasks/${response.body.data.id}`);
      expect(response.body.data).toMatchObject({
        ownerId: userId,
        title: 'Ship the final project',
        priority: 'high',
        status: 'todo',
        dueDate: '2026-04-01',
        completedAt: null,
      });
    });

    it('ignores client-supplied server-owned fields', async () => {
      const { token, userId } = await signUp('ada@example.com');

      const response = await request(app)
        .post('/api/tasks')
        .set(auth(token))
        .send({
          title: 'Mass assignment attempt',
          id: 'i-choose-this',
          ownerId: '00000000-0000-4000-8000-000000000000',
          status: 'done',
          createdAt: '1999-01-01T00:00:00.000Z',
        })
        .expect(201);

      // The schema omits these fields, so zod strips them.
      expect(response.body.data.id).not.toBe('i-choose-this');
      expect(response.body.data.ownerId).toBe(userId);
      expect(response.body.data.status).toBe('todo');
    });

    it('round-trips a due date without shifting the day', async () => {
      const { token } = await signUp('ada@example.com');

      const response = await request(app)
        .post('/api/tasks')
        .set(auth(token))
        .send({ title: 'Due dated', dueDate: '2026-03-01' })
        .expect(201);

      // A DATE column returns a Date at LOCAL midnight; toISOString() would
      // move it to the previous day west of UTC.
      expect(response.body.data.dueDate).toBe('2026-03-01');
    });

    it('reports every invalid field at once', async () => {
      const { token } = await signUp('ada@example.com');

      const response = await request(app)
        .post('/api/tasks')
        .set(auth(token))
        .send({ title: 'ab', priority: 'urgent', dueDate: 'tomorrow' })
        .expect(400);

      expect(Object.keys(response.body.error.details).sort()).toEqual(['dueDate', 'priority', 'title']);
    });

    it('rejects a duplicate title per owner, but allows it across owners', async () => {
      const ada = await signUp('ada@example.com');
      const grace = await signUp('grace@example.com');

      await request(app).post('/api/tasks').set(auth(ada.token)).send({ title: 'Write tests' }).expect(201);

      // Same owner, duplicate title -> 409 from the unique index.
      await request(app).post('/api/tasks').set(auth(ada.token)).send({ title: 'write TESTS' }).expect(409);

      // Different owner, same title -> fine. The index is (owner_id, lower(title)).
      await request(app).post('/api/tasks').set(auth(grace.token)).send({ title: 'Write tests' }).expect(201);
    });

    it('sets completedAt when a task becomes done, and clears it on reopen', async () => {
      const { token } = await signUp('ada@example.com');
      const created = await request(app)
        .post('/api/tasks')
        .set(auth(token))
        .send({ title: 'Finish me' })
        .expect(201);

      const done = await request(app)
        .patch(`/api/tasks/${created.body.data.id}`)
        .set(auth(token))
        .send({ status: 'done' })
        .expect(200);

      // Derived by the server, never accepted from the client - and the
      // database CHECK enforces the same pairing.
      expect(done.body.data.completedAt).not.toBeNull();

      const reopened = await request(app)
        .patch(`/api/tasks/${created.body.data.id}`)
        .set(auth(token))
        .send({ status: 'todo' })
        .expect(200);

      expect(reopened.body.data.completedAt).toBeNull();
    });

    it('rejects an invalid status transition with 409', async () => {
      const { token } = await signUp('ada@example.com');
      const created = await request(app).post('/api/tasks').set(auth(token)).send({ title: 'Finish me' });

      await request(app).patch(`/api/tasks/${created.body.data.id}`).set(auth(token)).send({ status: 'done' });

      const response = await request(app)
        .patch(`/api/tasks/${created.body.data.id}`)
        .set(auth(token))
        .send({ status: 'in_progress' })
        .expect(409);

      expect(response.body.error.message).toMatch(/Cannot move a task from done to in_progress/);
    });

    it('rejects an empty patch', async () => {
      const { token } = await signUp('ada@example.com');
      const created = await request(app).post('/api/tasks').set(auth(token)).send({ title: 'Patch me' });

      await request(app).patch(`/api/tasks/${created.body.data.id}`).set(auth(token)).send({}).expect(400);
    });

    it('lets the database trigger maintain updatedAt', async () => {
      const { token } = await signUp('ada@example.com');
      const created = await request(app).post('/api/tasks').set(auth(token)).send({ title: 'Trigger me' });

      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await request(app)
        .patch(`/api/tasks/${created.body.data.id}`)
        .set(auth(token))
        .send({ priority: 'high' })
        .expect(200);

      // Nothing in the UPDATE statement sets updated_at.
      expect(Date.parse(updated.body.data.updatedAt)).toBeGreaterThan(
        Date.parse(created.body.data.updatedAt),
      );
    });

    it('deletes, then 404s', async () => {
      const { token } = await signUp('ada@example.com');
      const created = await request(app).post('/api/tasks').set(auth(token)).send({ title: 'Delete me' });

      await request(app).delete(`/api/tasks/${created.body.data.id}`).set(auth(token)).expect(204);
      await request(app).delete(`/api/tasks/${created.body.data.id}`).set(auth(token)).expect(404);
    });

    it('returns 404 for a malformed id rather than a 500', async () => {
      const { token } = await signUp('ada@example.com');
      // Passing this straight to PostgreSQL would raise 22P02.
      await request(app).get('/api/tasks/not-a-uuid').set(auth(token)).expect(404);
    });

    it('returns 405 with an Allow header for a wrong method', async () => {
      const { token } = await signUp('ada@example.com');
      const response = await request(app).put('/api/tasks').set(auth(token)).expect(405);
      expect(response.headers.allow).toBe('GET, POST');
    });
  });

  // ===========================================================================
  describe('access control', () => {
    it('scopes the list to the authenticated user', async () => {
      const ada = await signUp('ada@example.com');
      const grace = await signUp('grace@example.com');

      await request(app).post('/api/tasks').set(auth(ada.token)).send({ title: 'Ada task' });
      await request(app).post('/api/tasks').set(auth(grace.token)).send({ title: 'Grace task' });

      const adaList = await request(app).get('/api/tasks').set(auth(ada.token)).expect(200);

      // The query itself is scoped - there is no check to forget.
      expect(adaList.body.data).toHaveLength(1);
      expect(adaList.body.data[0].title).toBe('Ada task');
    });

    it('returns 404 - not 403 - for another user\'s task', async () => {
      const ada = await signUp('ada@example.com');
      const grace = await signUp('grace@example.com');

      const created = await request(app)
        .post('/api/tasks')
        .set(auth(ada.token))
        .send({ title: "Ada's private task" })
        .expect(201);

      /*
       * THE IDOR TEST. Grace is fully authenticated - she just has no right to
       * this task. 403 would confirm the id exists, letting an attacker
       * enumerate valid ids.
       */
      const response = await request(app)
        .get(`/api/tasks/${created.body.data.id}`)
        .set(auth(grace.token))
        .expect(404);

      expect(JSON.stringify(response.body)).not.toContain("Ada's private task");
    });

    it('does not let one user update or delete another user\'s task', async () => {
      const ada = await signUp('ada@example.com');
      const grace = await signUp('grace@example.com');

      const created = await request(app)
        .post('/api/tasks')
        .set(auth(ada.token))
        .send({ title: 'Hands off' })
        .expect(201);

      await request(app)
        .patch(`/api/tasks/${created.body.data.id}`)
        .set(auth(grace.token))
        .send({ title: 'Mine now' })
        .expect(404);

      await request(app).delete(`/api/tasks/${created.body.data.id}`).set(auth(grace.token)).expect(404);

      // Untouched.
      const still = await request(app).get(`/api/tasks/${created.body.data.id}`).set(auth(ada.token)).expect(200);
      expect(still.body.data.title).toBe('Hands off');
    });

    it('scopes stats to the authenticated user', async () => {
      const ada = await signUp('ada@example.com');
      const grace = await signUp('grace@example.com');

      await request(app).post('/api/tasks').set(auth(ada.token)).send({ title: 'Ada one' });
      await request(app).post('/api/tasks').set(auth(ada.token)).send({ title: 'Ada two' });
      await request(app).post('/api/tasks').set(auth(grace.token)).send({ title: 'Grace one' });

      const stats = await request(app).get('/api/tasks/stats').set(auth(ada.token)).expect(200);
      expect(stats.body.data).toEqual({ total: 2, done: 0, open: 2, percentDone: 0 });
    });
  });

  // ===========================================================================
  describe('listing, filtering and pagination', () => {
    async function seedThree(token: string) {
      await request(app).post('/api/tasks').set(auth(token)).send({ title: 'Alpha', priority: 'high', dueDate: '2026-03-01' });
      await request(app).post('/api/tasks').set(auth(token)).send({ title: 'Bravo', priority: 'low' });
      await request(app).post('/api/tasks').set(auth(token)).send({ title: 'Charlie', priority: 'medium', dueDate: '2026-02-01' });
    }

    it('filters by status', async () => {
      const { token } = await signUp('ada@example.com');
      await seedThree(token);

      const list = await request(app).get('/api/tasks').set(auth(token));
      const first = list.body.data[0];
      await request(app).patch(`/api/tasks/${first.id}`).set(auth(token)).send({ status: 'done' });

      const done = await request(app).get('/api/tasks?status=done').set(auth(token)).expect(200);
      expect(done.body.data).toHaveLength(1);
      expect(done.body.meta.total).toBe(1);
    });

    it('searches case-insensitively', async () => {
      const { token } = await signUp('ada@example.com');
      await seedThree(token);

      const response = await request(app).get('/api/tasks?q=BRAV').set(auth(token)).expect(200);
      expect(response.body.data.map((t: { title: string }) => t.title)).toEqual(['Bravo']);
    });

    it('is not vulnerable to SQL injection through the search term', async () => {
      const { token } = await signUp('ada@example.com');
      await seedThree(token);

      const response = await request(app)
        .get(`/api/tasks?q=${encodeURIComponent("'; DROP TABLE tasks; --")}`)
        .set(auth(token))
        .expect(200);

      expect(response.body.data).toEqual([]);
      // The table survives, because the value never became part of the SQL.
      expect((await request(app).get('/api/tasks').set(auth(token))).body.meta.total).toBe(3);
    });

    it('sorts by priority meaningfully, not alphabetically', async () => {
      const { token } = await signUp('ada@example.com');
      await seedThree(token);

      const response = await request(app)
        .get('/api/tasks?sort=priority&order=asc')
        .set(auth(token))
        .expect(200);

      // As text, 'high' < 'low' < 'medium'. The CASE expression fixes it.
      expect(response.body.data.map((t: { priority: string }) => t.priority)).toEqual([
        'high',
        'medium',
        'low',
      ]);
    });

    it('sorts nulls last', async () => {
      const { token } = await signUp('ada@example.com');
      await seedThree(token);

      const response = await request(app).get('/api/tasks?sort=dueDate&order=asc').set(auth(token));
      // Bravo has no due date. "No due date" is not "due in 1970".
      expect(response.body.data.map((t: { title: string }) => t.title)).toEqual(['Charlie', 'Alpha', 'Bravo']);
    });

    it('paginates with a total across the whole result set', async () => {
      const { token } = await signUp('ada@example.com');
      await seedThree(token);

      const page = await request(app)
        .get('/api/tasks?pageSize=2&page=1&sort=title&order=asc')
        .set(auth(token))
        .expect(200);

      expect(page.body.data).toHaveLength(2);
      // count(*) OVER () - the pre-LIMIT total, from the same query.
      expect(page.body.meta).toEqual({ total: 3, page: 1, pageSize: 2, totalPages: 2 });
    });

    it('enforces the maximum page size', async () => {
      const { token } = await signUp('ada@example.com');
      // Without the cap, one client can ask the database for everything.
      await request(app).get('/api/tasks?pageSize=1000000').set(auth(token)).expect(400);
    });

    it('rejects an unknown sort column', async () => {
      const { token } = await signUp('ada@example.com');
      // The enum is the allow-list; the client's string never reaches the SQL.
      await request(app).get('/api/tasks?sort=password_hash').set(auth(token)).expect(400);
    });
  });

  // ===========================================================================
  describe('cross-cutting', () => {
    it('echoes an upstream request id into the header and the error body', async () => {
      const response = await request(app).get('/api/nope').set('x-request-id', 'trace-99').expect(404);

      expect(response.headers['x-request-id']).toBe('trace-99');
      expect(response.body.error.requestId).toBe('trace-99');
    });

    it('never leaks internals in a 500', async () => {
      const records: Record<string, unknown>[] = [];
      const logger = createLogger({ level: 'error', write: (r) => records.push(r) });

      const boom = createApp({
        config,
        authService: createAuthService(createUserRepository(pool), config),
        taskService: createTaskService(createTaskRepository(pool)),
        logger,
        enableRateLimit: false,
        registerExtraRoutes: (a) => {
          a.get('/boom', () => {
            throw new Error('postgres://admin:hunter2@db.internal:5432/prod'); // check-secrets:allow
          });
        },
      });

      const response = await request(boom).get('/boom').expect(500);

      expect(response.body.error.message).toBe('An unexpected error occurred');
      expect(JSON.stringify(response.body)).not.toMatch(/hunter2|db\.internal/);
      // ...but the detail IS logged, tied to the request id.
      expect(String(records[0]!.message)).toContain('hunter2');
    });

    it('rejects an oversized body with 413', async () => {
      const { token } = await signUp('ada@example.com');
      await request(app)
        .post('/api/tasks')
        .set(auth(token))
        .send({ title: 'x'.repeat(200_000) })
        .expect(413);
    });

    it('does not advertise the framework and sets security headers', async () => {
      const response = await request(app).get('/health/live').expect(200);
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  // ===========================================================================
  describe('config safety', () => {
    it('refuses to start without a DATABASE_URL', () => {
      expect(() => loadConfig({ JWT_SECRET: 'x'.repeat(32) })).toThrow(/DATABASE_URL/);
    });

    it('refuses a weak JWT_SECRET rather than defaulting one', () => {
      // A `?? 'dev-secret'` fallback ships to production the first time an env
      // var is forgotten, and then anyone can mint a token for any user.
      expect(() =>
        loadConfig({ DATABASE_URL: 'postgresql://localhost/x', JWT_SECRET: 'too-short' }),
      ).toThrow(/JWT_SECRET must be at least 32/);
    });

    it('redacts the password when logging the connection string', () => {
      // check-secrets:allow - a fabricated URL, the whole point of the assertion
      const redacted = safeDatabaseUrl('postgresql://app:s3cr3t@db.example.com:5432/prod');

      // You DO want the host and database in logs; you never want the password.
      expect(redacted).toContain('db.example.com');
      expect(redacted).not.toContain('s3cr3t');
      expect(redacted).toContain('***');
    });
  });
});

// Keep the import used when the suite is skipped.
void vi;

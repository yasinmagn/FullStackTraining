import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app.ts';
import { createInMemoryTaskRepository } from '../repository/taskRepository.ts';
import { createTaskService } from '../service/taskService.ts';
import type { Task } from '../domain/task.ts';

/**
 * HTTP tests.
 *
 * Because the business rules are already covered by `taskService.test.ts`,
 * these tests only have to check the things the HTTP layer is responsible for:
 * parsing, status codes, headers and the error envelope.
 *
 * That division is what keeps a test suite fast. Testing every business rule
 * through HTTP would mean paying for JSON serialisation and the whole
 * middleware stack to assert something a pure function could have told you.
 */

const seed: Task[] = [
  { id: 'a', title: 'Alpha', description: null, priority: 'high', status: 'todo', dueDate: '2026-03-01', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'b', title: 'Bravo', description: 'Second', priority: 'low', status: 'done', dueDate: null, createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
];

const quiet = { log: vi.fn(), error: vi.fn() };
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  const repository = createInMemoryTaskRepository(seed);
  app = createApp({ taskService: createTaskService(repository), logger: quiet });
});

describe('GET /api/tasks', () => {
  it('returns data and meta', async () => {
    const response = await request(app).get('/api/tasks').expect(200);

    expect(response.body.data).toHaveLength(2);
    // Every list endpoint returns the same envelope, so a client learns it once.
    expect(response.body.meta).toEqual({ total: 2, page: 1, pageSize: 20, totalPages: 1 });
  });

  it('applies defaults from the schema', async () => {
    const response = await request(app).get('/api/tasks').expect(200);
    // page and pageSize were never sent - zod's .default() supplied them, so
    // the service never has to deal with "unset".
    expect(response.body.meta.pageSize).toBe(20);
  });

  it('coerces numeric query params from strings', async () => {
    // Everything in a query string is a string. z.coerce.number() is what turns
    // '1' into 1 rather than failing a z.number() check.
    const response = await request(app).get('/api/tasks?page=1&pageSize=1').expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.totalPages).toBe(2);
  });

  it('rejects an unknown sort field with 400 and names it', async () => {
    const response = await request(app).get('/api/tasks?sort=passwordHash').expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(response.body.error.details).toHaveProperty('sort');
  });

  it('enforces the maximum page size', async () => {
    // Not a nicety: without the cap, one client can ask the database for
    // everything at once.
    const response = await request(app).get('/api/tasks?pageSize=1000000').expect(400);
    expect(response.body.error.details).toHaveProperty('pageSize');
  });

  it('rejects a page of 0', async () => {
    await request(app).get('/api/tasks?page=0').expect(400);
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns one task under `data`', async () => {
    const response = await request(app).get('/api/tasks/a').expect(200);
    expect(response.body.data.title).toBe('Alpha');
  });

  it('maps NotFoundError to 404 with a stable error code', async () => {
    const response = await request(app).get('/api/tasks/nope').expect(404);

    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Task nope was not found',
    });
    // Clients branch on `code`; `message` is for humans and may be reworded.
    expect(response.body.error.requestId).toBeDefined();
  });
});

describe('POST /api/tasks', () => {
  it('creates and returns 201 with a Location header', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Charlie', priority: 'high' })
      .expect(201);

    expect(response.headers.location).toBe(`/api/tasks/${response.body.data.id}`);
    expect(response.body.data).toMatchObject({ title: 'Charlie', priority: 'high', status: 'todo' });
  });

  it('applies the priority default', async () => {
    const response = await request(app).post('/api/tasks').send({ title: 'Delta' }).expect(201);
    expect(response.body.data.priority).toBe('medium');
  });

  it('ignores client-supplied server-controlled fields', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Echo', id: 'i-choose-this', status: 'done', createdAt: '1999-01-01T00:00:00.000Z' })
      .expect(201);

    // MASS ASSIGNMENT is the vulnerability this prevents. The schema does not
    // include id/status/createdAt, so zod strips them and the client cannot
    // set fields the server owns.
    expect(response.body.data.id).not.toBe('i-choose-this');
    expect(response.body.data.status).toBe('todo');
    expect(response.body.data.createdAt).not.toBe('1999-01-01T00:00:00.000Z');
  });

  it('returns 400 listing EVERY invalid field, not just the first', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'ab', priority: 'urgent', dueDate: 'tomorrow' })
      .expect(400);

    // A form that reports one problem per submit is a bad form.
    expect(Object.keys(response.body.error.details).sort()).toEqual(['dueDate', 'priority', 'title']);
  });

  it('maps ConflictError to 409, not 400', async () => {
    const response = await request(app).post('/api/tasks').send({ title: 'Alpha' }).expect(409);

    // The request was well-formed; it conflicts with existing state.
    expect(response.body.error.code).toBe('CONFLICT');
    expect(response.body.error.details).toEqual({ title: 'must be unique' });
  });

  it('returns 400 for malformed JSON', async () => {
    await request(app)
      .post('/api/tasks')
      .set('content-type', 'application/json')
      .send('{ not json')
      .expect(400);
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('applies a partial update', async () => {
    const response = await request(app).patch('/api/tasks/a').send({ priority: 'low' }).expect(200);

    expect(response.body.data.priority).toBe('low');
    expect(response.body.data.title).toBe('Alpha'); // omitted fields survive
  });

  it('rejects an empty patch with 400', async () => {
    // Almost always a client bug - a form that sent nothing, or a renamed
    // field. Returning 200 would hide it.
    const response = await request(app).patch('/api/tasks/a').send({}).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('maps an invalid status transition to 409', async () => {
    const response = await request(app).patch('/api/tasks/b').send({ status: 'in_progress' }).expect(409);
    expect(response.body.error.message).toMatch(/Cannot move a task from done to in_progress/);
  });

  it('returns 404 for an unknown id', async () => {
    await request(app).patch('/api/tasks/nope').send({ priority: 'low' }).expect(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('returns 204 with an empty body', async () => {
    const response = await request(app).delete('/api/tasks/a').expect(204);
    expect(response.text).toBe('');
  });

  it('returns 404 the second time', async () => {
    await request(app).delete('/api/tasks/a').expect(204);
    await request(app).delete('/api/tasks/a').expect(404);
  });
});

describe('method and route handling', () => {
  it('returns 405 with an Allow header for a wrong method on the collection', async () => {
    const response = await request(app).put('/api/tasks').expect(405);

    // 405 is genuinely different information from 404: the path exists.
    expect(response.headers.allow).toBe('GET, POST');
    expect(response.body.error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('returns 405 with an Allow header for a wrong method on a resource', async () => {
    const response = await request(app).post('/api/tasks/a').expect(405);
    expect(response.headers.allow).toBe('GET, PATCH, DELETE');
  });

  it('returns 404 for a route that does not exist at all', async () => {
    const response = await request(app).get('/api/widgets').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('cross-cutting concerns', () => {
  it('echoes an upstream request id', async () => {
    const response = await request(app).get('/health').set('x-request-id', 'trace-123').expect(200);
    expect(response.headers['x-request-id']).toBe('trace-123');
  });

  it('does not advertise the framework', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('uses the same error envelope for every failure', async () => {
    const responses = await Promise.all([
      request(app).get('/api/tasks/nope'),          // 404
      request(app).post('/api/tasks').send({}),      // 400
      request(app).post('/api/tasks').send({ title: 'Alpha' }), // 409
      request(app).put('/api/tasks'),                // 405
    ]);

    // One shape means a client writes ONE error handler.
    for (const response of responses) {
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    }
  });
});

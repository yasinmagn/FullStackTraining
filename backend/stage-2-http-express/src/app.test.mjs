import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app.mjs';

/**
 * INTEGRATION TESTS with supertest.
 *
 * `request(app)` drives the app in-process: no port bound, no server to tear
 * down, no race with a previous test's socket. It exercises the real
 * middleware stack, the real router and the real error handler - which is
 * exactly what you want, because that stack is where the bugs are.
 */

/** Silence the request logger; assert on it where the test is about logging. */
const quiet = { log: vi.fn(), error: vi.fn() };

const seed = [
  { id: '1', title: 'Understand middleware order', done: false },
  { id: '2', title: 'Return the right status codes', done: true },
];

const app = () => createApp({ logger: quiet, seed });

describe('GET /health', () => {
  it('returns 200 with a status body', async () => {
    const response = await request(app()).get('/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok' });
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('does not advertise the framework', async () => {
    const response = await request(app()).get('/health');
    // app.disable('x-powered-by') - free, and one less hint for a scanner.
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('GET /api/tasks', () => {
  it('returns the collection under a `data` key', async () => {
    const response = await request(app()).get('/api/tasks').expect(200);

    // An envelope leaves room to add `meta` (pagination) later WITHOUT a
    // breaking change. A bare top-level array does not.
    expect(response.body.data).toHaveLength(2);
  });

  it('filters by query string', async () => {
    const response = await request(app()).get('/api/tasks?done=true').expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('2');
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns one task', async () => {
    const response = await request(app()).get('/api/tasks/1').expect(200);
    expect(response.body.data.title).toBe('Understand middleware order');
  });

  it('returns 404 with a useful message for an unknown id', async () => {
    const response = await request(app()).get('/api/tasks/999').expect(404);
    expect(response.body.error.message).toBe('No task with id 999');
  });
});

describe('POST /api/tasks', () => {
  it('creates a task and returns 201 with a Location header', async () => {
    const response = await request(app())
      .post('/api/tasks')
      .send({ title: 'Write an integration test' })
      .expect(201);

    expect(response.headers.location).toBe('/api/tasks/3');
    expect(response.body.data).toMatchObject({ id: '3', title: 'Write an integration test', done: false });
  });

  it('trims the title', async () => {
    const response = await request(app()).post('/api/tasks').send({ title: '   Ship it   ' }).expect(201);
    expect(response.body.data.title).toBe('Ship it');
  });

  it('returns 400 with field details for a short title', async () => {
    const response = await request(app()).post('/api/tasks').send({ title: 'ab' }).expect(400);

    expect(response.body.error).toMatchObject({
      message: 'Validation failed',
      details: { title: 'must be at least 3 characters' },
    });
  });

  it('returns 400 for a missing body rather than crashing', async () => {
    // `req.body` is `{}` here, not undefined, because express.json() ran.
    await request(app()).post('/api/tasks').expect(400);
  });

  it('rejects malformed JSON with 400, not 500', async () => {
    // express.json() throws a SyntaxError with `status: 400` already set, and
    // our error handler honours it. A 500 here would be wrong: the client is
    // at fault, not the server.
    await request(app())
      .post('/api/tasks')
      .set('content-type', 'application/json')
      .send('{ not json')
      .expect(400);
  });

  it('rejects a body over the configured limit with 413', async () => {
    const huge = 'x'.repeat(200_000); // limit is 100kb
    await request(app()).post('/api/tasks').send({ title: huge }).expect(413);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('returns 204 with no body', async () => {
    const response = await request(app()).delete('/api/tasks/1').expect(204);
    expect(response.text).toBe('');
  });

  it('returns 404 for an unknown id', async () => {
    await request(app()).delete('/api/tasks/999').expect(404);
  });
});

describe('error handling', () => {
  it('returns 404 for an unmatched route', async () => {
    const response = await request(app()).get('/api/nope').expect(404);
    expect(response.body.error.message).toBe('Cannot GET /api/nope');
  });

  it('forwards a rejected async handler to the error handler (Express 5)', async () => {
    /*
     * In Express 4 this request hung forever, which is why every codebase
     * carried an asyncHandler wrapper or express-async-errors. Express 5
     * forwards rejected promises automatically - this test is the proof.
     */
    const response = await request(app()).get('/api/tasks/999/slow').expect(404);
    expect(response.body.error.message).toBe('No task with id 999');
  });

  it('turns an unexpected throw into a 500 and hides the internals', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };
    const boom = createApp({
      logger,
      registerExtraRoutes: (a) => {
        a.get('/boom', () => {
          throw new Error('connection to db-primary.internal:5432 refused');
        });
      },
    });

    const response = await request(boom).get('/boom').expect(500);

    // The client gets nothing useful to an attacker: no hostname, no port,
    // no stack. A stack trace leaks your directory layout, dependency
    // versions and often your schema.
    expect(response.body.error.message).toBe('Internal server error');
    expect(response.body.error.stack).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toMatch(/db-primary/);

    // ...while the full detail IS logged, server-side, with the request id.
    expect(logger.error).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(logger.error.mock.calls[0][0]);
    expect(logged.message).toMatch(/db-primary/);
    expect(logged.requestId).toBe(response.body.error.requestId);
  });

  it('can include the stack in development, when asked explicitly', async () => {
    const boom = createApp({
      logger: quiet,
      exposeStack: true,
      registerExtraRoutes: (a) => {
        a.get('/boom', () => {
          throw new Error('kaboom');
        });
      },
    });

    const response = await request(boom).get('/boom').expect(500);

    expect(response.body.error.stack).toContain('kaboom');
    // The message stays generic even here - only the stack is added.
    expect(response.body.error.message).toBe('Internal server error');
  });

  it('ignores a route registered AFTER the 404 handler', async () => {
    // Registration order IS the routing algorithm in Express. A route added
    // after notFoundHandler can never be reached - a real bug people hit when
    // they append a route to the bottom of a file.
    const app = createApp({ logger: quiet });
    app.get('/too-late', (_req, res) => res.json({ reached: true }));

    const response = await request(app).get('/too-late').expect(404);
    expect(response.body.error.message).toBe('Cannot GET /too-late');
  });
});

describe('request ids and logging', () => {
  it('generates a request id and echoes it in the header and error body', async () => {
    const response = await request(app()).get('/api/nope').expect(404);

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    // The same id in the body is what lets a user quote it in a bug report and
    // you find the exact log line.
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });

  it('honours an upstream x-request-id so a trace spans services', async () => {
    const response = await request(app())
      .get('/health')
      .set('x-request-id', 'trace-from-the-gateway')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('trace-from-the-gateway');
  });

  it('logs one structured line per request, after the response is sent', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };
    await request(createApp({ logger, seed })).get('/api/tasks').expect(200);

    expect(logger.log).toHaveBeenCalledTimes(1);
    const line = JSON.parse(logger.log.mock.calls[0][0]);
    expect(line).toMatchObject({ method: 'GET', path: '/api/tasks', status: 200 });
    // Status and duration are only knowable once the response has finished -
    // which is why the logger listens for res 'finish'.
    expect(typeof line.durationMs).toBe('number');
  });
});

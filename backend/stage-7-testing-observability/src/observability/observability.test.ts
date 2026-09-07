import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../http/app.ts';
import { createLogger, redact, type LogRecord } from './logger.ts';
import { createMetrics } from './metrics.ts';
import type { HealthCheck } from './health.ts';

/** Capture log lines instead of printing them. */
function captureLogger(level: 'debug' | 'info' = 'debug') {
  const records: LogRecord[] = [];
  return { records, logger: createLogger({ level, write: (r) => records.push(r) }) };
}

describe('logger', () => {
  it('writes structured records, not prose', () => {
    const { records, logger } = captureLogger();
    logger.info('task.created', { taskId: 'abc', durationMs: 12 });

    expect(records[0]).toMatchObject({ level: 'info', msg: 'task.created', taskId: 'abc', durationMs: 12 });
    // A machine-parseable timestamp on every line.
    expect(records[0]!.time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('respects the level threshold', () => {
    const records: LogRecord[] = [];
    const logger = createLogger({ level: 'warn', write: (r) => records.push(r) });

    logger.debug('noise');
    logger.info('also noise');
    logger.warn('kept');
    logger.error('kept');

    expect(records.map((r) => r.msg)).toEqual(['kept', 'kept']);
  });

  it('child loggers carry bindings onto every line', () => {
    const { records, logger } = captureLogger();
    const requestLog = logger.child({ requestId: 'req-1' });

    requestLog.info('first');
    requestLog.info('second');

    // This is what turns "find everything for this request" into a filter.
    expect(records.every((r) => r.requestId === 'req-1')).toBe(true);
  });

  it('redacts secrets wherever they appear', () => {
    const { records, logger } = captureLogger();

    logger.info('login.attempt', {
      user: { email: 'ada@example.com', password: 'hunter2' }, // check-secrets:allow
      headers: { authorization: 'Bearer abc.def.ghi', 'x-request-id': 'req-1' },
    });

    const record = records[0] as Record<string, any>;
    // Redaction is CENTRAL, so the person adding a log line does not have to
    // remember. Sooner or later someone logs a whole request body.
    expect(record.user.password).toBe('[redacted]');
    expect(record.headers.authorization).toBe('[redacted]');
    // Non-secret fields survive, or the logs would be useless.
    expect(record.user.email).toBe('ada@example.com');
    expect(record.headers['x-request-id']).toBe('req-1');
  });

  it('redacts through arrays and snake_case / kebab-case keys', () => {
    const output = redact({
      users: [{ password_hash: 'abc' }, { 'api-key': 'def' }],
      accessToken: 'ghi',
    }) as Record<string, any>;

    expect(output.users[0].password_hash).toBe('[redacted]');
    expect(output.users[1]['api-key']).toBe('[redacted]');
    expect(output.accessToken).toBe('[redacted]');
  });

  it('bounds recursion depth instead of hanging on a cycle', () => {
    const cyclic: Record<string, unknown> = { name: 'root' };
    cyclic.self = cyclic;

    // Infinite recursion inside a logger is a spectacular way to take down a
    // service. The depth bound is not decoration.
    expect(() => redact(cyclic)).not.toThrow();
  });
});

describe('metrics', () => {
  it('counts and renders in Prometheus format', () => {
    const metrics = createMetrics();
    metrics.incrementCounter('http_requests_total', { method: 'GET', status: '200' });
    metrics.incrementCounter('http_requests_total', { method: 'GET', status: '200' });
    metrics.incrementCounter('http_requests_total', { method: 'GET', status: '404' });

    const output = metrics.render();
    expect(output).toContain('http_requests_total{method="GET",status="200"} 2');
    expect(output).toContain('http_requests_total{method="GET",status="404"} 1');
  });

  it('sorts labels so the same combination is always one series', () => {
    const metrics = createMetrics();
    metrics.incrementCounter('x', { b: '2', a: '1' });
    metrics.incrementCounter('x', { a: '1', b: '2' });

    // Without sorting these would be two separate time series - and the graph
    // would show two half-height lines instead of one.
    expect(metrics.snapshot()['x{a="1",b="2"}']).toBe(2);
  });

  it('builds cumulative histogram buckets', () => {
    const metrics = createMetrics();
    for (const ms of [3, 30, 300]) metrics.observeHistogram('latency_ms', ms);

    const output = metrics.render();
    // Prometheus buckets are cumulative: le="50" counts everything <= 50ms.
    expect(output).toContain('latency_ms_bucket{le="5"} 1');
    expect(output).toContain('latency_ms_bucket{le="50"} 2');
    expect(output).toContain('latency_ms_bucket{le="500"} 3');
    expect(output).toContain('latency_ms_count 3');
    expect(output).toContain('latency_ms_sum 333');
  });
});

describe('health checks', () => {
  const build = (checks: HealthCheck[]) =>
    createApp({ logger: captureLogger().logger, metrics: createMetrics(), healthChecks: checks });

  it('liveness does NOT depend on the database', async () => {
    /*
     * The classic outage: liveness checks the database, the database hiccups,
     * every pod fails liveness, the orchestrator restarts every pod at once,
     * and they all reconnect and hammer the recovering database. A five-second
     * blip becomes a thirty-minute outage.
     */
    const app = build([{ name: 'database', check: async () => false, critical: true }]);

    await request(app).get('/health/live').expect(200);
  });

  it('readiness returns 503 when a critical dependency is down', async () => {
    const app = build([{ name: 'database', check: async () => false, critical: true }]);

    const response = await request(app).get('/health/ready').expect(503);

    // The load balancer reads the STATUS CODE, not your JSON. A cheerful 200
    // saying "unhealthy" keeps you in the rotation serving errors.
    expect(response.body.status).toBe('unhealthy');
    expect(response.body.checks.database.status).toBe('failed');
  });

  it('reports degraded - still 200 - when a NON-critical dependency is down', async () => {
    const app = build([
      { name: 'database', check: async () => true, critical: true },
      { name: 'cache', check: async () => false, critical: false },
    ]);

    const response = await request(app).get('/health/ready').expect(200);

    // Your cache being down should make you slower, not remove you from the
    // load balancer.
    expect(response.body.status).toBe('degraded');
  });

  it('times out a hanging check instead of hanging itself', async () => {
    const app = build([
      { name: 'slow', check: () => new Promise(() => {}), critical: true, timeoutMs: 50 },
    ]);

    const response = await request(app).get('/health/ready').expect(503);

    // A health check that hangs is worse than one that fails: the orchestrator
    // learns nothing and waits.
    expect(response.body.checks.slow.error).toMatch(/timed out after 50ms/);
  });

  it('surfaces a thrown error as a failed check', async () => {
    const app = build([
      {
        name: 'database',
        check: async () => {
          throw new Error('ECONNREFUSED');
        },
        critical: true,
      },
    ]);

    const response = await request(app).get('/health/ready').expect(503);
    expect(response.body.checks.database.error).toBe('ECONNREFUSED');
  });

  it('is ok with no checks configured', async () => {
    const response = await request(build([])).get('/health/ready').expect(200);
    expect(response.body.status).toBe('ok');
  });
});

describe('request instrumentation', () => {
  it('logs one line per request, after the response is sent', async () => {
    const { records, logger } = captureLogger();
    const app = createApp({ logger, metrics: createMetrics() });

    await request(app).get('/api/tasks').expect(200);

    const httpLog = records.find((r) => r.msg === 'http.request');
    expect(httpLog).toMatchObject({ method: 'GET', status: 200, route: '/api/tasks' });
    // Status and duration are only knowable once the response has finished.
    expect(typeof httpLog!.durationMs).toBe('number');
  });

  it('labels metrics by ROUTE PATTERN, not the resolved path', async () => {
    const metrics = createMetrics();
    const app = createApp({ logger: captureLogger().logger, metrics });

    const created = await request(app).post('/api/tasks').send({ title: 'Measure me' }).expect(201);
    await request(app).get(`/api/tasks/${created.body.data.id}`).expect(200);

    /*
     * CARDINALITY. Labelling by the resolved path would create one time series
     * per task id and melt the metrics backend. `/api/tasks/:id` is one series
     * however many tasks exist.
     */
    const rendered = metrics.render();
    expect(rendered).toContain('route="/api/tasks/:id"');
    expect(rendered).not.toContain(created.body.data.id);
  });

  it('logs a 4xx at warn and a 5xx at error', async () => {
    const { records, logger } = captureLogger();
    const app = createApp({
      logger,
      metrics: createMetrics(),
      registerExtraRoutes: (a) => {
        a.get('/boom', () => {
          throw new Error('kaboom');
        });
      },
    });

    await request(app).get('/api/tasks/does-not-exist').expect(404);
    await request(app).get('/boom').expect(500);

    const levels = records.filter((r) => r.msg === 'http.request').map((r) => r.level);
    expect(levels).toEqual(['warn', 'error']);
  });

  it('carries one request id through the header, the log and the error body', async () => {
    const { records, logger } = captureLogger();
    const app = createApp({ logger, metrics: createMetrics() });

    const response = await request(app).get('/api/tasks/nope').set('x-request-id', 'trace-42').expect(404);

    // The same id in all three places is what lets a user quote it in a bug
    // report and you find the exact log line.
    expect(response.headers['x-request-id']).toBe('trace-42');
    expect(response.body.error.requestId).toBe('trace-42');
    expect(records.every((r) => r.requestId === 'trace-42')).toBe(true);
  });

  it('exposes metrics in Prometheus text format', async () => {
    const metrics = createMetrics();
    const app = createApp({ logger: captureLogger().logger, metrics });

    await request(app).get('/api/tasks').expect(200);
    const response = await request(app).get('/metrics').expect(200);

    expect(response.headers['content-type']).toMatch(/text\/plain/);
    expect(response.text).toContain('http_requests_total');
    expect(response.text).toContain('http_request_duration_ms_bucket');
  });

  it('never leaks a stack trace, but always logs one', async () => {
    const { records, logger } = captureLogger();
    const app = createApp({
      logger,
      metrics: createMetrics(),
      registerExtraRoutes: (a) => {
        a.get('/boom', () => {
          throw new Error('db-primary.internal is unreachable');
        });
      },
    });

    const response = await request(app).get('/boom').expect(500);

    expect(response.body.error.message).toBe('An unexpected error occurred');
    expect(JSON.stringify(response.body)).not.toContain('db-primary');

    const errorLog = records.find((r) => r.msg === 'unhandled.error');
    expect(errorLog!.stack).toContain('db-primary');
  });
});

describe('mocking, sparingly', () => {
  it('uses fake timers rather than really waiting', () => {
    /*
     * A test that waits 30 real seconds is a test nobody runs. Fake timers make
     * time an input you control.
     *
     * Contrast with the health-check timeout test above, which uses a REAL 50ms
     * timer: when the delay is short and the code under test is the timing
     * itself, real timers are simpler and prove more.
     */
    vi.useFakeTimers();
    const onTick = vi.fn();
    const interval = setInterval(onTick, 10_000);

    vi.advanceTimersByTime(35_000);
    expect(onTick).toHaveBeenCalledTimes(3);

    clearInterval(interval);
    vi.useRealTimers();
  });

  it('injects a dependency instead of mocking a module', () => {
    /*
     * `createLogger({ write })` takes its output as an argument, so the test
     * substitutes a capture function with no `vi.mock` anywhere.
     *
     * Module mocking is a last resort: it couples the test to import paths, so
     * every refactor breaks it. Dependency injection is the fix, and it is a
     * design improvement rather than a testing trick.
     */
    const records: LogRecord[] = [];
    createLogger({ write: (r) => records.push(r) }).info('injected');

    expect(records).toHaveLength(1);
  });
});

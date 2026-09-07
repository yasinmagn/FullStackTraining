import { describe, expect, it, vi } from 'vitest';
import { HttpError, delay, fetchJson, mapWithConcurrency, settleAll, withRetry } from './async.js';

/** Build a minimal stand-in for a `Response`. No network, no server, no flake. */
function jsonResponse(body, { status = 200, statusText = 'OK' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

describe('fetchJson', () => {
  it('returns the parsed body on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: 1, title: 'Ship it' }));

    await expect(fetchJson('/api/tasks/1', { fetchImpl })).resolves.toEqual({ id: 1, title: 'Ship it' });
  });

  it('throws HttpError on 4xx - fetch itself would NOT', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: 'Task not found' }, { status: 404, statusText: 'Not Found' }));

    // This is the whole reason the wrapper exists: raw `fetch` resolves here.
    await expect(fetchJson('/api/tasks/999', { fetchImpl })).rejects.toMatchObject({
      name: 'HttpError',
      status: 404,
      message: 'Task not found',
    });
  });

  it('survives a non-JSON error page', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse('<html>502 Bad Gateway</html>', { status: 502 }));

    // `response.json()` would have thrown a confusing SyntaxError here.
    const error = await fetchJson('/api/tasks', { fetchImpl }).catch((e) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(502);
    expect(error.body).toContain('502 Bad Gateway');
  });

  it('wraps network failures as status 0', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchJson('/api/tasks', { fetchImpl })).rejects.toMatchObject({ status: 0 });
  });
});

describe('withRetry', () => {
  it('retries a 503 and eventually succeeds', async () => {
    let calls = 0;
    const operation = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new HttpError(503, 'Service Unavailable');
      return 'ok';
    });

    await expect(withRetry(operation, { baseDelayMs: 1 })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry a 400 - a bad request stays bad', async () => {
    const operation = vi.fn(async () => {
      throw new HttpError(400, 'Title is required');
    });

    await expect(withRetry(operation, { baseDelayMs: 1 })).rejects.toMatchObject({ status: 400 });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('gives up after the configured number of retries', async () => {
    const operation = vi.fn(async () => {
      throw new HttpError(500, 'boom');
    });

    await expect(withRetry(operation, { retries: 2, baseDelayMs: 1 })).rejects.toThrow('boom');
    expect(operation).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });
});

describe('mapWithConcurrency', () => {
  it('preserves input order in the results', async () => {
    const results = await mapWithConcurrency([30, 10, 20], 2, async (ms) => {
      await delay(ms / 10);
      return ms;
    });

    // Faster items finish first, but the output must still line up with the input.
    expect(results).toEqual([30, 10, 20]);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await delay(1);
      inFlight--;
      return n;
    });

    expect(peak).toBeLessThanOrEqual(2);
  });
});

describe('settleAll', () => {
  it('keeps the successes when one promise rejects', async () => {
    // Promise.all would have thrown away 'a' and 'c' entirely.
    const { fulfilled, rejected } = await settleAll([
      Promise.resolve('a'),
      Promise.reject(new Error('widget down')),
      Promise.resolve('c'),
    ]);

    expect(fulfilled).toEqual(['a', 'c']);
    expect(rejected).toHaveLength(1);
  });
});

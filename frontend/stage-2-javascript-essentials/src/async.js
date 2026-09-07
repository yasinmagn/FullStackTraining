/**
 * Asynchrony: promises, async/await, fetch, timeouts and error handling.
 *
 * The single most common frontend bug is an unhandled rejection that silently
 * leaves a spinner on screen forever. Everything here is about making failure
 * explicit.
 */

/**
 * An error that carries the HTTP status, so callers can branch on it
 * (`404` -> show "not found", `401` -> redirect to login) instead of
 * string-matching a message.
 *
 * Extending Error and setting `name` keeps stack traces useful.
 */
export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {unknown} [body]
   */
  constructor(status, message, body) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Sleep. Handy for backoff and for demos.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `fetch` with the three things the raw API does NOT give you:
 *
 *   1. It does not reject on 4xx/5xx. `fetch` only rejects on *network*
 *      failure. A 500 resolves happily with `ok === false`. Forgetting this is
 *      the classic "why is my error handler never called" bug.
 *   2. It has no timeout. A hung request hangs forever without an AbortSignal.
 *   3. It does not parse JSON, and a non-JSON error page will blow up
 *      `response.json()` with a confusing SyntaxError.
 *
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<unknown>}
 */
export async function fetchJson(url, options = {}) {
  const { timeoutMs = 8000, fetchImpl = fetch, ...init } = options;

  // AbortSignal.timeout() is the modern one-liner for "give up after N ms".
  const signal = init.signal ?? AbortSignal.timeout(timeoutMs);

  let response;
  try {
    response = await fetchImpl(url, {
      ...init,
      signal,
      headers: { accept: 'application/json', ...init.headers },
    });
  } catch (cause) {
    // DNS failure, offline, CORS, or our own timeout all land here.
    if (cause?.name === 'TimeoutError' || cause?.name === 'AbortError') {
      throw new HttpError(0, `Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw new HttpError(0, `Network request to ${url} failed`, cause);
  }

  // Parse the body once, defensively - an nginx 502 returns HTML, not JSON.
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      (body && typeof body === 'object' && body.message) || `${response.status} ${response.statusText}`;
    throw new HttpError(response.status, message, body);
  }

  return body;
}

/**
 * Retry with exponential backoff.
 *
 * Retrying a 400 is pointless - the request is wrong and will stay wrong. Only
 * retry things that might succeed on their own: network blips, 429, and 5xx.
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @param {{ retries?: number, baseDelayMs?: number, isRetryable?: (error: unknown) => boolean }} [options]
 * @returns {Promise<T>}
 */
export async function withRetry(operation, options = {}) {
  const {
    retries = 3,
    baseDelayMs = 100,
    isRetryable = (error) => error instanceof HttpError && (error.status === 0 || error.status === 429 || error.status >= 500),
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetryable(error)) throw error;
      // 100ms, 200ms, 400ms ... Doubling keeps a struggling server from being
      // hammered by every client at once.
      await delay(baseDelayMs * 2 ** attempt);
    }
  }

  throw lastError;
}

/**
 * Run async work over a list, at most `limit` at a time.
 *
 * `Promise.all(items.map(fn))` starts EVERY request simultaneously. With 500
 * items you will hit connection limits and rate limits. This is the bounded
 * version.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} worker
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runner() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  // Start `limit` runners; each pulls the next index until the queue is empty.
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

/**
 * `Promise.all` rejects as soon as ANY promise rejects, losing the successes.
 * `Promise.allSettled` waits for all of them and reports each outcome - the
 * right choice for a dashboard where one broken widget should not blank the
 * page.
 *
 * @template T
 * @param {Promise<T>[]} promises
 * @returns {Promise<{ fulfilled: T[], rejected: unknown[] }>}
 */
export async function settleAll(promises) {
  const outcomes = await Promise.allSettled(promises);
  return {
    fulfilled: outcomes.filter((o) => o.status === 'fulfilled').map((o) => o.value),
    rejected: outcomes.filter((o) => o.status === 'rejected').map((o) => o.reason),
  };
}

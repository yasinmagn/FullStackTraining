import { describe, expect, it, vi } from 'vitest';
import { debounce, groupBy, memoise, parseQuery, pick, timeout } from './exercises.js';

/*
 * These tests are SKIPPED so that `npm test` at the repo root stays green
 * before you have done the work.
 *
 * Change `describe.skip` to `describe` below, then make them pass.
 */
describe.skip('Stage 2 exercises', () => {
  describe('pick', () => {
    it('keeps only the requested keys', () => {
      expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('skips keys that are absent rather than adding undefined', () => {
      const result = pick({ a: 1 }, ['a', 'zzz']);
      expect(result).toEqual({ a: 1 });
      expect('zzz' in result).toBe(false);
    });

    it('does not mutate the source', () => {
      const source = { a: 1, b: 2 };
      pick(source, ['a']);
      expect(source).toEqual({ a: 1, b: 2 });
    });
  });

  describe('groupBy', () => {
    it('groups by the computed key', () => {
      expect(groupBy([1, 2, 3, 4], (n) => (n % 2 ? 'odd' : 'even'))).toEqual({
        odd: [1, 3],
        even: [2, 4],
      });
    });

    it('returns an empty object for an empty list', () => {
      expect(groupBy([], () => 'x')).toEqual({});
    });
  });

  describe('debounce', () => {
    it('runs once, with the last arguments', async () => {
      vi.useFakeTimers();
      const spy = vi.fn();
      const debounced = debounce(spy, 300);

      debounced('a');
      debounced('ab');
      debounced('abc');

      expect(spy).not.toHaveBeenCalled(); // nothing yet
      vi.advanceTimersByTime(300);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('abc');
      vi.useRealTimers();
    });

    it('runs again after the quiet period', () => {
      vi.useFakeTimers();
      const spy = vi.fn();
      const debounced = debounce(spy, 100);

      debounced(1);
      vi.advanceTimersByTime(100);
      debounced(2);
      vi.advanceTimersByTime(100);

      expect(spy).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  describe('memoise', () => {
    it('calls the underlying function once per distinct argument list', () => {
      const spy = vi.fn((a, b) => a + b);
      const memoised = memoise(spy);

      expect(memoised(1, 2)).toBe(3);
      expect(memoised(1, 2)).toBe(3);
      expect(memoised(2, 3)).toBe(5);

      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('parseQuery', () => {
    it('parses a simple query string', () => {
      expect(parseQuery('?page=2&sort=title')).toEqual({ page: '2', sort: 'title' });
    });

    it('collects repeated keys into an array', () => {
      expect(parseQuery('?tag=a&tag=b')).toEqual({ tag: ['a', 'b'] });
    });

    it('handles an empty input', () => {
      expect(parseQuery('')).toEqual({});
    });

    it('decodes percent-encoded values', () => {
      expect(parseQuery('?q=hello%20world')).toEqual({ q: 'hello world' });
    });
  });

  describe('timeout', () => {
    it('resolves when the promise wins', async () => {
      await expect(timeout(Promise.resolve('fast'), 50)).resolves.toBe('fast');
    });

    it('rejects with "timeout" when the clock wins', async () => {
      const slow = new Promise((resolve) => setTimeout(() => resolve('slow'), 200));
      await expect(timeout(slow, 20)).rejects.toThrow('timeout');
    });

    it('propagates the original rejection', async () => {
      await expect(timeout(Promise.reject(new Error('boom')), 50)).rejects.toThrow('boom');
    });
  });
});

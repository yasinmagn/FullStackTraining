import { describe, expect, it } from 'vitest';
import {
  comparePriority,
  deepFreeze,
  groupTasksByStatus,
  mapResult,
  partition,
  sortBy,
} from './exercises.js';
import { err, ok } from './validation.js';
import type { Task, TaskId } from './domain.js';

const task = (over: Partial<Task>): Task => ({
  id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' as TaskId,
  title: 'Task',
  description: null,
  priority: 'medium',
  status: 'todo',
  assigneeId: null,
  dueDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

/* Change `describe.skip` to `describe` when you start. */
describe.skip('Stage 3 exercises', () => {
  describe('sortBy', () => {
    const people = [
      { name: 'Grace', age: 45 },
      { name: 'Ada', age: 36 },
      { name: 'Alan', age: 41 },
    ];

    it('sorts ascending by a string key', () => {
      expect(sortBy(people, 'name').map((p) => p.name)).toEqual(['Ada', 'Alan', 'Grace']);
    });

    it('sorts descending by a numeric key', () => {
      expect(sortBy(people, 'age', 'desc').map((p) => p.age)).toEqual([45, 41, 36]);
    });

    it('does not mutate the input', () => {
      const before = people.map((p) => p.name);
      sortBy(people, 'age');
      expect(people.map((p) => p.name)).toEqual(before);
    });
  });

  describe('partition', () => {
    it('returns [matching, notMatching] as a tuple', () => {
      const [even, odd] = partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);
      expect(even).toEqual([2, 4]);
      expect(odd).toEqual([1, 3, 5]);
    });

    it('handles an empty list', () => {
      expect(partition([], () => true)).toEqual([[], []]);
    });
  });

  describe('mapResult', () => {
    it('transforms a success', () => {
      expect(mapResult(ok('ship it'), (s) => s.toUpperCase())).toEqual({ ok: true, value: 'SHIP IT' });
    });

    it('passes a failure straight through without calling the mapper', () => {
      let called = false;
      const result = mapResult(err(['boom']), () => {
        called = true;
        return 'never';
      });

      expect(result).toEqual({ ok: false, error: ['boom'] });
      expect(called).toBe(false);
    });
  });

  describe('deepFreeze', () => {
    it('freezes nested objects and arrays', () => {
      const config = deepFreeze({ api: { url: '/api', retries: [1, 2, 3] } });

      expect(Object.isFrozen(config)).toBe(true);
      expect(Object.isFrozen(config.api)).toBe(true);
      expect(Object.isFrozen(config.api.retries)).toBe(true);
    });

    it('makes nested mutation throw in strict mode', () => {
      const config = deepFreeze({ api: { url: '/api' } });
      // ES modules are always strict, so a frozen write throws rather than
      // failing silently.
      expect(() => {
        (config.api as { url: string }).url = '/hacked';
      }).toThrow();
    });
  });

  describe('groupTasksByStatus', () => {
    it('always includes every status key, even when empty', () => {
      const groups = groupTasksByStatus([task({ status: 'done' }), task({ status: 'done' })]);

      expect(Object.keys(groups).sort()).toEqual(['done', 'in_progress', 'todo']);
      expect(groups.done).toHaveLength(2);
      // No optional chaining needed - that is the point of the type.
      expect(groups.in_progress).toEqual([]);
      expect(groups.todo).toEqual([]);
    });
  });

  describe('comparePriority', () => {
    it('sorts high first', () => {
      const tasks = [task({ priority: 'low' }), task({ priority: 'high' }), task({ priority: 'medium' })];

      expect([...tasks].sort(comparePriority).map((t) => t.priority)).toEqual(['high', 'medium', 'low']);
    });
  });
});

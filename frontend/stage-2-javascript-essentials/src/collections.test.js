import { describe, expect, it } from 'vitest';
import {
  addTask,
  freeze,
  groupByPriority,
  removeTask,
  sortByPriority,
  summarise,
  updateTask,
} from './collections.js';

/** @type {import('./collections.js').Task[]} */
const tasks = [
  { id: 'a', title: 'Write tests', priority: 'high', done: false },
  { id: 'b', title: 'Review PR', priority: 'low', done: true },
  { id: 'c', title: 'Ship it', priority: 'high', done: false },
];

describe('immutable updates', () => {
  it('addTask returns a new array and leaves the original alone', () => {
    const next = addTask(tasks, { id: 'd', title: 'Deploy', priority: 'medium', done: false });

    expect(next).toHaveLength(4);
    expect(tasks).toHaveLength(3); // the original is untouched
    expect(next).not.toBe(tasks); // ...and it is a DIFFERENT array
  });

  it('updateTask only replaces the object that changed', () => {
    const next = updateTask(tasks, 'a', { done: true });

    expect(next[0]).toEqual({ id: 'a', title: 'Write tests', priority: 'high', done: true });
    // This is the property React relies on to skip re-rendering untouched rows.
    expect(next[1]).toBe(tasks[1]);
    expect(next[0]).not.toBe(tasks[0]);
  });

  it('does not mutate frozen input', () => {
    // Object.freeze makes mutation throw in strict mode, so this test *proves*
    // purity rather than just asserting the result looks right.
    const frozen = freeze(tasks.map(freeze));
    expect(() => removeTask(frozen, 'b')).not.toThrow();
    expect(removeTask(frozen, 'b').map((t) => t.id)).toEqual(['a', 'c']);
  });
});

describe('sorting and grouping', () => {
  it('sorts high priority first, then alphabetically', () => {
    expect(sortByPriority(tasks).map((t) => t.title)).toEqual(['Ship it', 'Write tests', 'Review PR']);
  });

  it('sortByPriority does not mutate its input', () => {
    const before = tasks.map((t) => t.id);
    sortByPriority(tasks);
    expect(tasks.map((t) => t.id)).toEqual(before);
  });

  it('groups by priority', () => {
    const grouped = groupByPriority(tasks);
    expect(Object.keys(grouped).sort()).toEqual(['high', 'low']);
    expect(grouped.high.map((t) => t.id)).toEqual(['a', 'c']);
  });
});

describe('summarise', () => {
  it('counts and computes a percentage', () => {
    expect(summarise(tasks)).toEqual({ total: 3, done: 1, open: 2, percentDone: 33 });
  });

  it('does not divide by zero on an empty list', () => {
    // Without the guard this would be NaN, and the UI would render "NaN%".
    expect(summarise([])).toEqual({ total: 0, done: 0, open: 0, percentDone: 0 });
  });
});

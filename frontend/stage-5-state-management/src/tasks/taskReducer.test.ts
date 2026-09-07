import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInitialState,
  initialTasksState,
  resetIdCounter,
  selectIsFiltered,
  selectStats,
  selectVisibleTasks,
  taskReducer,
  type TaskAction,
} from './taskReducer.ts';
import type { TasksState } from './types.ts';

/**
 * Notice what is absent: no `render()`, no DOM, no `act()`, no test library.
 *
 * A reducer is a pure function, so testing it is testing a function. This suite
 * covers the entire state machine in milliseconds. That is the strongest
 * practical argument for `useReducer` over scattered `useState` calls.
 */

beforeEach(resetIdCounter);

/** Apply a list of actions in order - handy for setting up a scenario. */
const run = (state: TasksState, ...actions: TaskAction[]): TasksState =>
  actions.reduce(taskReducer, state);

describe('adding tasks', () => {
  it('adds to the front of the list with sensible defaults', () => {
    const state = taskReducer(initialTasksState, {
      type: 'task/added',
      title: 'Write a reducer test',
      priority: 'high',
    });

    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0]).toMatchObject({
      title: 'Write a reducer test',
      priority: 'high',
      status: 'todo',
    });
  });

  it('trims the title', () => {
    const state = taskReducer(initialTasksState, {
      type: 'task/added',
      title: '   Ship it   ',
      priority: 'low',
    });

    expect(state.tasks[0]?.title).toBe('Ship it');
  });

  it('ignores an empty title AND returns the identical state object', () => {
    const state = taskReducer(initialTasksState, { type: 'task/added', title: '   ', priority: 'low' });

    // Same reference => React skips the re-render entirely.
    expect(state).toBe(initialTasksState);
  });
});

describe('mutating a task', () => {
  /**
   * Built inside each test, not once at module scope: `beforeEach` resets the
   * id counter, so a fixture created during collection would hand out ids that
   * later tasks then reuse. Shared mutable fixtures are a classic flaky-test
   * source - build state per test instead.
   */
  const seed = () => {
    const state = run(initialTasksState, { type: 'task/added', title: 'Task A', priority: 'low' });
    return { state, id: state.tasks[0]!.id };
  };

  it('toggles done and back', () => {
    const { state: seeded, id } = seed();
    const done = taskReducer(seeded, { type: 'task/toggled', id });
    expect(done.tasks[0]?.status).toBe('done');

    const undone = taskReducer(done, { type: 'task/toggled', id });
    expect(undone.tasks[0]?.status).toBe('todo');
  });

  it('never mutates the previous state', () => {
    const { state: seeded, id } = seed();
    taskReducer(seeded, { type: 'task/toggled', id });
    // The original is untouched - this is what makes undo/redo and time-travel
    // debugging possible at all.
    expect(seeded.tasks[0]?.status).toBe('todo');
  });

  it('renames and closes the editor in one action', () => {
    const { state: seeded, id } = seed();
    const editing = taskReducer(seeded, { type: 'editing/started', id });
    expect(editing.editingId).toBe(id);

    const renamed = taskReducer(editing, { type: 'task/renamed', id, title: 'Task A (renamed)' });
    expect(renamed.tasks[0]?.title).toBe('Task A (renamed)');
    expect(renamed.editingId).toBeNull();
  });

  it('closes the editor when the task being edited is removed', () => {
    const { state: seeded, id } = seed();
    // The bug this prevents: an open inline editor pointing at a task that no
    // longer exists. Two related updates, one atomic action.
    const editing = taskReducer(seeded, { type: 'editing/started', id });
    const removed = taskReducer(editing, { type: 'task/removed', id });

    expect(removed.tasks).toHaveLength(0);
    expect(removed.editingId).toBeNull();
  });

  it('leaves an unrelated editor open when a different task is removed', () => {
    const { state: seeded, id } = seed();
    const two = taskReducer(seeded, { type: 'task/added', title: 'Task B', priority: 'low' });
    const otherId = two.tasks[0]!.id;

    const editing = taskReducer(two, { type: 'editing/started', id });
    const removed = taskReducer(editing, { type: 'task/removed', id: otherId });

    expect(removed.editingId).toBe(id);
  });
});

describe('clearing completed', () => {
  it('removes only done tasks', () => {
    const state = run(
      initialTasksState,
      { type: 'task/added', title: 'A', priority: 'low' },
      { type: 'task/added', title: 'B', priority: 'low' },
    );
    const doneId = state.tasks[1]!.id;

    const cleared = run(state, { type: 'task/toggled', id: doneId }, { type: 'tasks/completedCleared' });

    expect(cleared.tasks.map((t) => t.title)).toEqual(['B']);
  });

  it('is a no-op - same reference - when nothing is done', () => {
    const state = taskReducer(initialTasksState, { type: 'task/added', title: 'A', priority: 'low' });
    expect(taskReducer(state, { type: 'tasks/completedCleared' })).toBe(state);
  });
});

describe('selectors (derived state)', () => {
  const base = createInitialState(1_000_000);

  it('filters by status', () => {
    const state = { ...base, statusFilter: 'done' } as const;
    expect(selectVisibleTasks(state).map((t) => t.id)).toEqual(['t1']);
  });

  it('filters by a case-insensitive query', () => {
    const state = { ...base, query: 'REDUCER' } as const;
    expect(selectVisibleTasks(state).map((t) => t.id)).toEqual(['t3']);
  });

  it('combines query and status filters', () => {
    const state = { ...base, query: 'e', statusFilter: 'todo' } as const;
    expect(selectVisibleTasks(state).map((t) => t.id)).toEqual(['t3']);
  });

  it('sorts by priority without mutating the source array', () => {
    const state = { ...base, sortKey: 'priority' } as const;
    const order = selectVisibleTasks(state).map((t) => t.priority);

    expect(order).toEqual(['high', 'high', 'medium']);
    expect(base.tasks.map((t) => t.id)).toEqual(['t1', 't2', 't3']); // untouched
  });

  it('computes stats without dividing by zero', () => {
    expect(selectStats(base)).toEqual({ total: 3, done: 1, open: 2, percentDone: 33 });
    expect(selectStats(initialTasksState)).toEqual({ total: 0, done: 0, open: 0, percentDone: 0 });
  });

  it('knows whether any filter is active', () => {
    expect(selectIsFiltered(base)).toBe(false);
    expect(selectIsFiltered({ ...base, query: 'x' })).toBe(true);
    expect(selectIsFiltered(taskReducer({ ...base, query: 'x' }, { type: 'filter/cleared' }))).toBe(false);
  });
});

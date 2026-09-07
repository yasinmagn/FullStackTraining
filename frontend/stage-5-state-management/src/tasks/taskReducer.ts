import type { Priority, StatusFilter, SortKey, Task, TasksState } from './types.ts';

/**
 * A reducer is a pure function:
 *
 *     (state, action) -> newState
 *
 * Three properties fall out of that, and all three are why reducers beat a
 * fistful of `useState` calls once a screen gets complicated:
 *
 *   1. Every way the state can change is listed in ONE file. You can read the
 *      whole state machine top to bottom.
 *   2. It is pure, so you can unit-test it with no React, no DOM and no
 *      rendering. See taskReducer.test.ts - that suite runs in milliseconds.
 *   3. Components dispatch INTENT ("toggled a task"), not mechanism ("here is
 *      the new array"). The rules live in one place instead of being copied
 *      into every call site.
 */

// --- Actions ---------------------------------------------------------------
//
// A discriminated union, exactly as in Stage 3. The `type` field is the
// discriminant, so `switch (action.type)` narrows the payload for you.

export type TaskAction =
  | { type: 'task/added'; title: string; priority: Priority }
  | { type: 'task/toggled'; id: string }
  | { type: 'task/removed'; id: string }
  | { type: 'task/renamed'; id: string; title: string }
  | { type: 'task/statusChanged'; id: string; status: Task['status'] }
  | { type: 'editing/started'; id: string }
  | { type: 'editing/stopped' }
  | { type: 'filter/queryChanged'; query: string }
  | { type: 'filter/statusChanged'; status: StatusFilter }
  | { type: 'filter/sortChanged'; sortKey: SortKey }
  | { type: 'filter/cleared' }
  | { type: 'tasks/completedCleared' };

export const initialTasksState: TasksState = {
  tasks: [],
  query: '',
  statusFilter: 'all',
  sortKey: 'created',
  editingId: null,
};

/** Seed data, so the first run is not an empty screen. */
export function createInitialState(now = Date.now()): TasksState {
  return {
    ...initialTasksState,
    tasks: [
      { id: 't1', title: 'Read the Stage 5 lesson', priority: 'medium', status: 'done', createdAt: now - 3000 },
      { id: 't2', title: 'Delete a redundant useState', priority: 'high', status: 'in_progress', createdAt: now - 2000 },
      { id: 't3', title: 'Write a reducer test', priority: 'high', status: 'todo', createdAt: now - 1000 },
    ],
  };
}

let idCounter = 0;
/**
 * Injectable so tests are deterministic. A reducer must be PURE, and
 * `crypto.randomUUID()` inside one would make it unpredictable - the same
 * (state, action) pair would produce different results. Generate ids in the
 * action creator, or with a counter the tests can reset.
 */
export function nextId(): string {
  idCounter += 1;
  return `task-${idCounter}`;
}
export function resetIdCounter(): void {
  idCounter = 0;
}

export function taskReducer(state: TasksState, action: TaskAction): TasksState {
  switch (action.type) {
    case 'task/added': {
      const title = action.title.trim();
      // A no-op returns the SAME state object. React bails out of re-rendering
      // when the reference is unchanged - free performance, and it keeps
      // invalid input from entering the store at all.
      if (title.length === 0) return state;

      const task: Task = {
        id: nextId(),
        title,
        priority: action.priority,
        status: 'todo',
        createdAt: Date.now(),
      };
      return { ...state, tasks: [task, ...state.tasks] };
    }

    case 'task/toggled':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id
            ? { ...task, status: task.status === 'done' ? 'todo' : 'done' }
            : task,
        ),
      };

    case 'task/statusChanged':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, status: action.status } : task,
        ),
      };

    case 'task/removed':
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.id),
        // Removing the task being edited must also close the editor, or the UI
        // is left pointing at something that no longer exists. Keeping related
        // updates in one action is exactly what a reducer is for.
        editingId: state.editingId === action.id ? null : state.editingId,
      };

    case 'task/renamed': {
      const title = action.title.trim();
      if (title.length === 0) return { ...state, editingId: null };

      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.id ? { ...task, title } : task)),
        editingId: null,
      };
    }

    case 'editing/started':
      return { ...state, editingId: action.id };

    case 'editing/stopped':
      return state.editingId === null ? state : { ...state, editingId: null };

    case 'filter/queryChanged':
      return { ...state, query: action.query };

    case 'filter/statusChanged':
      return { ...state, statusFilter: action.status };

    case 'filter/sortChanged':
      return { ...state, sortKey: action.sortKey };

    case 'filter/cleared':
      return { ...state, query: '', statusFilter: 'all', sortKey: 'created' };

    case 'tasks/completedCleared': {
      const remaining = state.tasks.filter((task) => task.status !== 'done');
      // Nothing removed? Return the same reference and skip the render.
      if (remaining.length === state.tasks.length) return state;
      return { ...state, tasks: remaining };
    }

    default:
      // Exhaustiveness check from Stage 3. Add an action variant without
      // handling it and this stops compiling.
      return assertNever(action);
  }
}

function assertNever(action: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(action)}`);
}

// --- Selectors -------------------------------------------------------------
//
// DERIVED DATA. These are plain functions over state, deliberately NOT stored.
//
// Keeping them here, beside the reducer, means a component never reimplements
// "what counts as visible" - and if the rule changes, it changes once.

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const satisfies Record<Priority, number>;

export function selectVisibleTasks(state: TasksState): readonly Task[] {
  const query = state.query.trim().toLowerCase();

  const filtered = state.tasks.filter((task) => {
    const matchesStatus = state.statusFilter === 'all' || task.status === state.statusFilter;
    const matchesQuery = query === '' || task.title.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  // toSorted, not sort - `state.tasks` must not be mutated.
  switch (state.sortKey) {
    case 'priority':
      return filtered.toSorted(
        (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.createdAt - a.createdAt,
      );
    case 'title':
      return filtered.toSorted((a, b) => a.title.localeCompare(b.title));
    case 'created':
      return filtered.toSorted((a, b) => b.createdAt - a.createdAt);
    default:
      return assertNever(state.sortKey);
  }
}

export function selectStats(state: TasksState) {
  const total = state.tasks.length;
  const done = state.tasks.filter((task) => task.status === 'done').length;
  return {
    total,
    done,
    open: total - done,
    percentDone: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function selectIsFiltered(state: TasksState): boolean {
  return state.query !== '' || state.statusFilter !== 'all' || state.sortKey !== 'created';
}

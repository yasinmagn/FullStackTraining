import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { createInitialState, taskReducer, type TaskAction } from './taskReducer.ts';
import type { TasksState } from './types.ts';

/**
 * Context solves ONE problem: prop drilling.
 *
 * Without it, `tasks` and `dispatch` have to be threaded through every
 * intermediate component that does not care about them:
 *
 *   App -> Layout -> Sidebar -> FilterPanel -> StatusFilter
 *
 * Context is NOT a state manager and NOT a performance optimisation. It is a
 * delivery mechanism. The state still lives in `useReducer` right here.
 *
 * -------------------------------------------------------------------------
 * THE PERFORMANCE TRAP, and why there are two contexts below
 * -------------------------------------------------------------------------
 * Every consumer of a context re-renders when that context's VALUE changes by
 * reference. Put state and dispatch in one object and a component that only
 * ever dispatches - a button, say - re-renders on every keystroke in the
 * search box.
 *
 * Splitting them fixes it: `dispatch` is referentially stable for the lifetime
 * of the component (React guarantees this), so `TasksDispatchContext` never
 * changes value and its consumers never re-render from context.
 */

const TasksStateContext = createContext<TasksState | null>(null);
const TasksDispatchContext = createContext<Dispatch<TaskAction> | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  /**
   * The third argument is a LAZY initialiser. React calls it once, on the first
   * render only.
   *
   *   useReducer(taskReducer, createInitialState())    <- runs on EVERY render
   *   useReducer(taskReducer, undefined, createInitialState)  <- runs once
   *
   * With cheap seed data the difference is invisible; with `JSON.parse` of a
   * large localStorage blob it is the whole cost of every render.
   */
  const [state, dispatch] = useReducer(taskReducer, undefined, createInitialState);

  return (
    <TasksDispatchContext.Provider value={dispatch}>
      {/*
        `state` is a new object on every change, which is exactly what we want:
        consumers of the STATE context should re-render when state changes.
        No useMemo needed here - memoising a value that changes every time it
        changes accomplishes nothing.
      */}
      <TasksStateContext.Provider value={state}>{children}</TasksStateContext.Provider>
    </TasksDispatchContext.Provider>
  );
}

/**
 * Custom hooks that throw when used outside the provider.
 *
 * Two reasons this is worth the four extra lines:
 *   1. The return type is `TasksState`, not `TasksState | null`, so no consumer
 *      needs a null check.
 *   2. The error names the actual mistake instead of surfacing later as
 *      "cannot read property tasks of null" from somewhere unrelated.
 */
export function useTasksState(): TasksState {
  const state = useContext(TasksStateContext);
  if (state === null) throw new Error('useTasksState must be used inside <TasksProvider>');
  return state;
}

export function useTasksDispatch(): Dispatch<TaskAction> {
  const dispatch = useContext(TasksDispatchContext);
  if (dispatch === null) throw new Error('useTasksDispatch must be used inside <TasksProvider>');
  return dispatch;
}

/**
 * A selector hook: subscribe to a DERIVED slice rather than the whole state.
 *
 * Be honest about what this does and does not do. The component still
 * re-renders whenever the state context changes - plain React context has no
 * way to skip that. What `useMemo` buys you is not recomputing the selector,
 * and a stable result reference so that any memoised children below do not
 * re-render.
 *
 * If you genuinely need to skip re-renders on unrelated state changes, that is
 * the point where an external store (Zustand, Redux Toolkit, Jotai) with
 * `useSyncExternalStore` earns its place. See the lesson, section 9.
 */
export function useTasksSelector<T>(selector: (state: TasksState) => T): T {
  const state = useTasksState();
  return useMemo(() => selector(state), [selector, state]);
}

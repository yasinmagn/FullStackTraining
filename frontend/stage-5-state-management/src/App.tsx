import { CounterLab } from './components/CounterLab.tsx';
import { TaskFilters } from './components/TaskFilters.tsx';
import { TaskForm } from './components/TaskForm.tsx';
import { TaskList } from './components/TaskList.tsx';
import { TasksProvider, useTasksDispatch, useTasksState } from './tasks/TasksProvider.tsx';
import { selectStats } from './tasks/taskReducer.ts';
import { useLocalStorage } from './hooks/useLocalStorage.ts';

export default function App() {
  /*
   * PER-USER PREFERENCE, not app state.
   *
   * `showLab` belongs to this component and is persisted for convenience. It
   * has no business in the task reducer - keeping unrelated concerns out of a
   * shared store is as important as putting shared concerns in.
   */
  const { value: showLab, setValue: setShowLab } = useLocalStorage('stage5:showLab', true);

  return (
    // Everything inside can reach task state. Nothing outside can - which is
    // the point: the provider defines the scope of the shared state.
    <TasksProvider>
      <main className="app">
        <header className="app-header">
          <h1>Task Board</h1>
          <p className="tagline">Stage 5 &middot; state: local, derived, lifted and shared</p>
        </header>

        <section className="card">
          <header className="card-header">
            <h2>Tasks</h2>
            <StatsBadge />
          </header>
          <div className="card-body stack">
            <TaskForm />
            <TaskFilters />
            <TaskList />
          </div>
          <footer className="card-footer">
            <ClearCompletedButton />
          </footer>
        </section>

        <section className="card">
          <header className="card-header">
            <h2>useState lab</h2>
            <button type="button" className="ghost" onClick={() => setShowLab(!showLab)}>
              {showLab ? 'Hide' : 'Show'}
            </button>
          </header>
          {showLab && (
            <div className="card-body">
              <CounterLab />
            </div>
          )}
        </section>
      </main>
    </TasksProvider>
  );
}

/**
 * Reads state. Re-renders whenever any task state changes - correct, because
 * every one of those changes can move these numbers.
 */
function StatsBadge() {
  const stats = selectStats(useTasksState());

  return (
    <span className="badge" data-tone={stats.open === 0 ? 'success' : 'info'}>
      {stats.done}/{stats.total} done
    </span>
  );
}

/**
 * Dispatch-only.
 *
 * This is the component that justifies splitting the two contexts in
 * TasksProvider: it never reads state, `dispatch` is referentially stable, so
 * typing in the search box does not re-render this button.
 *
 * (It does read state for the `disabled` flag, which is an honest trade-off -
 * try deleting that line and watching the difference in React DevTools'
 * "Highlight updates when components render" mode.)
 */
function ClearCompletedButton() {
  const dispatch = useTasksDispatch();
  const stats = selectStats(useTasksState());

  return (
    <button
      type="button"
      className="ghost"
      disabled={stats.done === 0}
      onClick={() => dispatch({ type: 'tasks/completedCleared' })}
    >
      Clear {stats.done} completed
    </button>
  );
}

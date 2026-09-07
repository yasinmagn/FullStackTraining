import { useTasksDispatch, useTasksState } from '../tasks/TasksProvider.tsx';
import { selectIsFiltered } from '../tasks/taskReducer.ts';
import { STATUS_LABELS, type SortKey, type StatusFilter } from '../tasks/types.ts';

const STATUS_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: STATUS_LABELS.todo },
  { value: 'in_progress', label: STATUS_LABELS.in_progress },
  { value: 'done', label: STATUS_LABELS.done },
];

const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: 'created', label: 'Newest first' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title A-Z' },
];

/**
 * SHARED state, deliberately.
 *
 * The filter controls live here, but the list that obeys them lives in
 * `TaskList`, a sibling. Two siblings sharing state is exactly the case for
 * lifting it - and since the shared owner is the whole app, it lives in the
 * reducer behind context.
 *
 * Note there is no `filteredTasks` anywhere. This component stores the user's
 * CHOICE; `selectVisibleTasks` derives the consequence.
 */
export function TaskFilters() {
  const state = useTasksState();
  const dispatch = useTasksDispatch();
  const isFiltered = selectIsFiltered(state);

  return (
    <div className="filters">
      <div className="field">
        <label htmlFor="search">Search</label>
        <input
          id="search"
          type="search"
          value={state.query}
          onChange={(event) => dispatch({ type: 'filter/queryChanged', query: event.target.value })}
          placeholder="Filter by title"
        />
      </div>

      {/*
        role="group" + aria-pressed, exactly as in Stage 1. A "segmented
        control" made of <button>s needs the pressed state announced; the CSS
        styles from the same attribute so the two cannot drift.
      */}
      <div className="segmented" role="group" aria-label="Filter by status">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="ghost"
            aria-pressed={state.statusFilter === option.value}
            onClick={() => dispatch({ type: 'filter/statusChanged', status: option.value })}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="field field-narrow">
        <label htmlFor="sort">Sort</label>
        <select
          id="sort"
          value={state.sortKey}
          onChange={(event) =>
            dispatch({ type: 'filter/sortChanged', sortKey: event.target.value as SortKey })
          }
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className="ghost" disabled={!isFiltered} onClick={() => dispatch({ type: 'filter/cleared' })}>
        Reset
      </button>
    </div>
  );
}

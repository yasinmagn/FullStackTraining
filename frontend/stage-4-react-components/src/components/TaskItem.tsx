import { Badge } from './Badge.tsx';
import { PRIORITY_LABELS, STATUS_LABELS, type Priority, type Task } from '../types.ts';

/**
 * Presentational component.
 *
 * It receives data and callbacks and renders markup. It does not fetch, it does
 * not own state, and it does not know where `onToggle` goes. That makes it
 * trivial to test, trivial to reuse, and trivial to reason about.
 *
 * The naming convention is worth adopting deliberately:
 *   - a prop that IS data           ->  `task`, `isSelected`
 *   - a prop that is a callback     ->  `onToggle`, `onRemove`  (on + event)
 */
interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

/** Derived from data, computed at render time. Never stored in state. */
const PRIORITY_TONE = {
  low: 'neutral',
  medium: 'info',
  high: 'danger',
} as const satisfies Record<Priority, 'neutral' | 'info' | 'danger'>;

export function TaskItem({ task, onToggle, onRemove }: TaskItemProps) {
  const isDone = task.status === 'done';

  return (
    <li className="task-item" data-done={isDone}>
      <input
        type="checkbox"
        id={`task-${task.id}`}
        checked={isDone}
        /*
         * An inline arrow is how you pass an argument to a handler. The
         * alternative, `onChange={onToggle(task.id)}`, CALLS it during render -
         * a classic beginner bug that fires every handler on every render.
         */
        onChange={() => onToggle(task.id)}
      />

      <div className="task-main">
        <label htmlFor={`task-${task.id}`} className="task-title">
          {task.title}
        </label>

        {/*
          Conditional rendering. `description` is `string | null`, and React
          renders null/undefined/false as nothing at all - no wrapper, no gap.
        */}
        {task.description && <p className="task-description">{task.description}</p>}
      </div>

      <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
      <Badge tone={isDone ? 'success' : 'neutral'}>{STATUS_LABELS[task.status]}</Badge>

      {task.dueDate && (
        // <time> carries machine-readable meaning; the text stays human.
        <time className="task-due" dateTime={task.dueDate}>
          {new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
            new Date(task.dueDate),
          )}
        </time>
      )}

      <button
        type="button"
        className="ghost"
        onClick={() => onRemove(task.id)}
        aria-label={`Remove ${task.title}`}
      >
        &times;
      </button>
    </li>
  );
}

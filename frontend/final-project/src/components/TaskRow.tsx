import type { Task, TaskStatus } from '../api/client.ts';

interface TaskRowProps {
  task: Task;
  onToggle: (status: TaskStatus) => void;
  onDelete: () => void;
}

const PRIORITY_TONE = { low: 'neutral', medium: 'info', high: 'danger' } as const;

/**
 * A presentational row: data in, callbacks out. It does not fetch, does not own
 * state, and does not know where `onToggle` leads - which is what makes it
 * trivial to test.
 */
export function TaskRow({ task, onToggle, onDelete }: TaskRowProps) {
  const isDone = task.status === 'done';

  return (
    <li className="task-item" data-done={isDone}>
      <input
        type="checkbox"
        id={`task-${task.id}`}
        checked={isDone}
        onChange={() => onToggle(isDone ? 'todo' : 'done')}
        aria-label={`Mark ${task.title} as ${isDone ? 'not done' : 'done'}`}
      />

      <div className="task-main">
        <label htmlFor={`task-${task.id}`} className="task-title">{task.title}</label>
        {task.description && <p className="task-description">{task.description}</p>}
      </div>

      <span className="badge" data-tone={PRIORITY_TONE[task.priority]}>{task.priority}</span>

      {task.dueDate && (
        // <time> carries machine-readable meaning; the text stays human.
        <time className="task-due" dateTime={task.dueDate}>
          {new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
            // Parse as UTC so the displayed day matches the stored calendar
            // date rather than shifting for viewers west of UTC.
            new Date(`${task.dueDate}T00:00:00Z`),
          )}
        </time>
      )}

      <button
        type="button"
        className="ghost"
        onClick={onDelete}
        aria-label={`Delete ${task.title}`}
      >
        &times;
      </button>
    </li>
  );
}

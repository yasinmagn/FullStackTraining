import { useState } from 'react';
import { useTasksDispatch } from '../tasks/TasksProvider.tsx';
import { PRIORITY_LABELS, STATUS_LABELS, type Task } from '../tasks/types.ts';

interface TaskRowProps {
  task: Task;
  isEditing: boolean;
}

export function TaskRow({ task, isEditing }: TaskRowProps) {
  const dispatch = useTasksDispatch();

  return (
    <li className="task-item" data-done={task.status === 'done'}>
      <input
        type="checkbox"
        id={`done-${task.id}`}
        checked={task.status === 'done'}
        onChange={() => dispatch({ type: 'task/toggled', id: task.id })}
        aria-label={`Mark ${task.title} as done`}
      />

      {isEditing ? (
        /*
         * `key={task.id}` on the editor is doing real work.
         *
         * The `key` prop is React's identity, so CHANGING a key destroys the
         * component and mounts a fresh one - which resets its state. Without
         * it, clicking edit on task B while task A's editor was open would
         * reuse the same component instance and show A's half-typed draft.
         *
         * "Reset state with a key" is the idiomatic alternative to a
         * useEffect that watches a prop and calls setState.
         */
        <InlineEditor
          key={task.id}
          initialTitle={task.title}
          onSave={(title) => dispatch({ type: 'task/renamed', id: task.id, title })}
          onCancel={() => dispatch({ type: 'editing/stopped' })}
        />
      ) : (
        <button
          type="button"
          className="task-title-button"
          onClick={() => dispatch({ type: 'editing/started', id: task.id })}
          aria-label={`Rename ${task.title}`}
        >
          {task.title}
        </button>
      )}

      <span className="badge" data-tone={task.priority === 'high' ? 'danger' : 'neutral'}>
        {PRIORITY_LABELS[task.priority]}
      </span>

      <select
        className="status-select"
        value={task.status}
        onChange={(event) =>
          dispatch({
            type: 'task/statusChanged',
            id: task.id,
            status: event.target.value as Task['status'],
          })
        }
        aria-label={`Status of ${task.title}`}
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="ghost"
        onClick={() => dispatch({ type: 'task/removed', id: task.id })}
        aria-label={`Remove ${task.title}`}
      >
        &times;
      </button>
    </li>
  );
}

interface InlineEditorProps {
  initialTitle: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}

/**
 * An UNCONTROLLED-ish pattern done correctly: the draft is local state, seeded
 * once from a prop.
 *
 * The wrong way to seed it is an effect:
 *
 *   useEffect(() => setDraft(initialTitle), [initialTitle]);  // don't
 *
 * That renders once with the stale value, then again with the right one, and
 * clobbers whatever the user typed if the prop ever changes mid-edit. Seeding
 * `useState` directly and resetting via `key` (see TaskRow above) avoids both.
 */
function InlineEditor({ initialTitle, onSave, onCancel }: InlineEditorProps) {
  const [draft, setDraft] = useState(initialTitle);

  return (
    <input
      className="task-title-input"
      value={draft}
      autoFocus
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onSave(draft)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSave(draft);
        if (event.key === 'Escape') onCancel();
      }}
      aria-label="Task title"
    />
  );
}

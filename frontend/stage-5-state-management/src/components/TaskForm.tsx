import { useState } from 'react';
import { useTasksDispatch } from '../tasks/TasksProvider.tsx';
import { PRIORITY_LABELS, type Priority } from '../tasks/types.ts';

/**
 * LOCAL state, deliberately.
 *
 * `title` and `priority` are half-finished input that nothing else in the app
 * needs. Hoisting them into the reducer would mean every keystroke dispatches
 * an action and re-renders the entire task list.
 *
 * The question to ask about any piece of state is: WHO NEEDS THIS?
 *   - only this component            -> useState, right here
 *   - this component and a sibling   -> lift it to the nearest common parent
 *   - most of the app                -> reducer + context (see TasksProvider)
 *   - the server owns it             -> a data-fetching library (Stage 6)
 */
export function TaskForm() {
  const dispatch = useTasksDispatch();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');

  const trimmed = title.trim();
  const isValid = trimmed.length >= 3; // derived, not stored

  return (
    <form
      className="task-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isValid) return;

        // The component says WHAT HAPPENED, not what the new array should be.
        dispatch({ type: 'task/added', title: trimmed, priority });
        setTitle('');
      }}
    >
      <div className="field">
        <label htmlFor="new-title">New task</label>
        {/*
          A CONTROLLED input: React owns the value.

          `value` + `onChange` together mean the DOM can never disagree with
          state. Supply `value` without `onChange` and React makes the field
          read-only and warns - a very common first-day confusion.
        */}
        <input
          id="new-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          autoComplete="off"
        />
      </div>

      <div className="field field-narrow">
        <label htmlFor="new-priority">Priority</label>
        <select
          id="new-priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
        >
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={!isValid}>
        Add
      </button>
    </form>
  );
}

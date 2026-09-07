import type { ReactNode } from 'react';
import { TaskItem } from './TaskItem.tsx';
import type { Task } from '../types.ts';

interface TaskListProps {
  tasks: readonly Task[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  /** A slot for the empty case, so the caller controls the wording. */
  emptyState?: ReactNode;
}

export function TaskList({ tasks, onToggle, onRemove, emptyState }: TaskListProps) {
  // Handle the empty case first. An early return is cheaper to read than a
  // ternary wrapped around the whole tree.
  if (tasks.length === 0) {
    return <p className="empty">{emptyState ?? 'Nothing here.'}</p>;
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        /*
         * KEYS.
         *
         * `key` is React's identity for a list item across renders. It answers
         * "is this the same row as before, or a different one?"
         *
         * Use the item's stable id. Using the array index instead means that
         * deleting row 0 makes every subsequent row look like it *changed
         * content* rather than moved - so React reuses the wrong DOM nodes, and
         * component state (a checkbox, an open dropdown, text mid-edit) sticks
         * to the wrong row.
         *
         * Try it: change `key={task.id}` to `key={index}`, tick the second
         * checkbox, then delete the first task. The lesson walks through it.
         */
        <TaskItem key={task.id} task={task} onToggle={onToggle} onRemove={onRemove} />
      ))}
    </ul>
  );
}

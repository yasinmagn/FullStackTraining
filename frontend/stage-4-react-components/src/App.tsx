import { useState } from 'react';
import { Badge } from './components/Badge.tsx';
import { Card } from './components/Card.tsx';
import { TaskList } from './components/TaskList.tsx';
import { TaskStats } from './components/TaskStats.tsx';
import { SAMPLE_TASKS, type Task } from './types.ts';

/**
 * Stage 4 is about COMPONENTS. `useState` appears here only because a static
 * page would be a poor demonstration - Stage 5 is where state gets taken
 * seriously.
 *
 * The shape to notice:
 *
 *   App                 owns the data and the handlers  (the "container")
 *    +- TaskStats       receives data                    (presentational)
 *    +- TaskList        receives data + callbacks        (presentational)
 *        +- TaskItem    receives one task + callbacks    (presentational)
 *            +- Badge   receives children                (presentational)
 *
 * One component owns the state; the rest just render what they are given. This
 * separation is what makes the leaves reusable and testable.
 */
export default function App() {
  const [tasks, setTasks] = useState<readonly Task[]>(SAMPLE_TASKS);

  // Immutable updates - Stage 2's lesson, now load-bearing. Mutating `tasks`
  // here would leave the reference unchanged and React would not re-render.
  const toggleTask = (id: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, status: task.status === 'done' ? 'todo' : 'done' } : task,
      ),
    );
  };

  const removeTask = (id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  // Derived, not stored.
  const openCount = tasks.filter((task) => task.status !== 'done').length;

  return (
    <main className="app">
      <header className="app-header">
        <h1>Task Board</h1>
        <p className="tagline">Stage 4 &middot; components, props and composition</p>
      </header>

      <Card
        title="Tasks"
        /* Slots in action: the caller decides what sits in the header and
           footer. The Card itself has no idea what a "task" is. */
        action={<Badge tone={openCount > 0 ? 'info' : 'success'}>{openCount} open</Badge>}
        footer={<TaskStats tasks={tasks} />}
      >
        <TaskList
          tasks={tasks}
          onToggle={toggleTask}
          onRemove={removeTask}
          emptyState="All clear. Add a task in Stage 5."
        />
      </Card>

      <Card title="What to look at">
        <ul className="notes">
          <li>
            <code>Card.tsx</code> - slots (<code>title</code>, <code>action</code>,{' '}
            <code>footer</code>) instead of a growing pile of boolean props.
          </li>
          <li>
            <code>TaskList.tsx</code> - <code>key={'{task.id}'}</code>, and what breaks when you use
            the array index instead.
          </li>
          <li>
            <code>TaskStats.tsx</code> - derived values computed during render, never stored.
          </li>
          <li>
            <code>TaskItem.tsx</code> - <code>onChange={'{() => onToggle(id)}'}</code>, and why
            dropping the arrow calls the handler during render.
          </li>
        </ul>
      </Card>
    </main>
  );
}

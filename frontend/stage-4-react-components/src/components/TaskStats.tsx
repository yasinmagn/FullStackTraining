import type { Task } from '../types.ts';

interface TaskStatsProps {
  tasks: readonly Task[];
}

/**
 * Derived state, computed during render.
 *
 * There is no `useState` here and there must not be. If these numbers were
 * stored in state you would need an effect to keep them in sync with `tasks`,
 * and that effect would be one render behind - which is exactly how "the count
 * says 3 but there are 4 rows" bugs happen.
 *
 * The rule: if a value can be computed from props or state, compute it.
 */
export function TaskStats({ tasks }: TaskStatsProps) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === 'done').length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="stats">
      {/*
        `role="progressbar"` plus the aria-value* attributes make this readable
        by assistive tech. A bare styled <div> announces nothing.
      */}
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tasks completed"
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="stats-text">
        {done} of {total} done ({percent}%)
      </p>
    </div>
  );
}

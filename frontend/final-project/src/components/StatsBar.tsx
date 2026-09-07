import type { Stats } from '../api/client.ts';

/**
 * The numbers come from the SERVER (`/api/tasks/stats`), not from counting the
 * current page.
 *
 * That distinction matters: the page holds 10 of 47 tasks, so counting locally
 * would show "3 of 10 done" while the user has 47. Derived data belongs with
 * whoever holds the full dataset.
 */
export function StatsBar({ stats }: { stats: Stats }) {
  return (
    <section className="card">
      <div className="card-body stats">
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={stats.percentDone}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tasks completed"
        >
          <div className="progress-fill" style={{ width: `${stats.percentDone}%` }} />
        </div>
        <p className="stats-text">
          {stats.done} of {stats.total} done ({stats.percentDone}%) &middot; {stats.open} open
        </p>
      </div>
    </section>
  );
}

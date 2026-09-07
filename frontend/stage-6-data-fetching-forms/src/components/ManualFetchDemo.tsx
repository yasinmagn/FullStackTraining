import { useEffect, useState } from 'react';
import { fakeApi } from '../api/fakeServer.ts';
import type { Task } from '../api/schemas.ts';

/**
 * Data fetching by hand, so you can see exactly what TanStack Query is doing
 * for you - and what it is *hard* to get right without it.
 *
 * Toggle the checkbox to switch between the naive version and the fixed one,
 * then type quickly in the search box.
 */
export function ManualFetchDemo() {
  const [query, setQuery] = useState('');
  const [fixed, setFixed] = useState(true);

  return (
    <div className="stack">
      <div className="filters">
        <div className="field">
          <label htmlFor="manual-query">Search (type fast)</label>
          <input
            id="manual-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. 'optimistic'"
          />
        </div>
        <label className="checkbox-field">
          <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} />
          Cancel stale requests
        </label>
      </div>

      {fixed ? <FixedList query={query} /> : <RacyList query={query} />}

      <p className="lab-note">
        With cancelling off, type <code>optimistic</code> quickly. Requests come back out of order,
        so the list can end up showing results for a query you have already replaced. Every request
        here takes ~400ms, and the fake server does not answer them in order.
      </p>
    </div>
  );
}

/**
 * THE BUG.
 *
 * Requests are asynchronous and do not necessarily resolve in the order they
 * were sent. Type "abc" and three requests go out; if the one for "a" resolves
 * last, its results overwrite the ones for "abc". The UI now shows data for a
 * query the user has already changed, with no error and no warning.
 *
 * This is a genuine race condition, and it ships to production constantly.
 */
function RacyList({ query }: { query: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fakeApi
      .listTasks({ query })
      .then((result) => {
        // No guard. Whatever lands last wins, correct or not.
        setTasks(result.data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [query]);

  return <ResultList tasks={tasks} isLoading={isLoading} label="racy" />;
}

/**
 * THE FIX.
 *
 * An `ignore` flag in the effect's closure, flipped by the cleanup function.
 * When `query` changes, React runs the previous cleanup FIRST, so the old
 * request's `.then` finds `ignore === true` and does nothing.
 *
 * (In real code you would use an `AbortController` so the request is actually
 * cancelled on the wire, not merely ignored. The flag is enough to show the
 * shape.)
 *
 * Now count what this component still does NOT do: no caching, no
 * deduplication across components, no retries, no background refetch, no
 * "keep the previous page while loading", no request deduping on remount. That
 * list is why the next section uses a library.
 */
function FixedList({ query }: { query: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);

    fakeApi
      .listTasks({ query })
      .then((result) => {
        if (ignore) return; // a newer query has superseded this one
        setTasks(result.data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [query]);

  return <ResultList tasks={tasks} isLoading={isLoading} label="cancelled" />;
}

function ResultList({ tasks, isLoading, label }: { tasks: Task[]; isLoading: boolean; label: string }) {
  return (
    <div>
      <p className="lab-note">
        mode: <code>{label}</code>
        {isLoading && ' - loading...'}
      </p>
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className="task-item">
            <span className="task-main">{task.title}</span>
          </li>
        ))}
      </ul>
      {tasks.length === 0 && !isLoading && <p className="empty">No matches.</p>}
    </div>
  );
}

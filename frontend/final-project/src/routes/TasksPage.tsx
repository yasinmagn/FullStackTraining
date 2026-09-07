import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.tsx';
import {
  taskListQuery,
  taskStatsQuery,
  useDeleteTask,
  useUpdateTaskStatus,
  type TaskListParams,
} from '../api/queries.ts';
import type { TaskStatus } from '../api/client.ts';
import { useDebouncedValue } from '../hooks/useDebouncedValue.ts';
import { TaskForm } from '../components/TaskForm.tsx';
import { TaskRow } from '../components/TaskRow.tsx';
import { StatsBar } from '../components/StatsBar.tsx';

const PAGE_SIZE = 10;

export function TasksPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  /*
   * FILTERS LIVE IN THE URL.
   *
   * They survive a refresh, can be bookmarked, can be shared with a colleague,
   * and work with the back button. `useSearchParams` has the same shape as
   * `useState`, so this costs almost nothing.
   */
  const status = (searchParams.get('status') ?? 'all') as TaskStatus | 'all';
  const sort = (searchParams.get('sort') ?? 'createdAt') as TaskListParams['sort'];
  const page = Number(searchParams.get('page') ?? 1);

  /*
   * The search box is LOCAL state so typing stays instant; only the debounced
   * value reaches the query key, so no request is built for the keystrokes in
   * between.
   */
  const [rawQuery, setRawQuery] = useState(searchParams.get('q') ?? '');
  const q = useDebouncedValue(rawQuery, 300);

  const params: TaskListParams = { status, q, page, pageSize: PAGE_SIZE, sort, order: 'desc' };

  const tasks = useQuery(taskListQuery(token!, params));
  const stats = useQuery(taskStatsQuery(token!));
  const updateStatus = useUpdateTaskStatus(token!, params);
  const deleteTask = useDeleteTask(token!, params);

  /** Update one search param without wiping the others. */
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === '' || value === 'all' || value === 'createdAt') next.delete(key);
    else next.set(key, value);
    // Changing a filter invalidates the page number.
    if (key !== 'page') next.delete('page');
    // `replace` so flipping between filters does not fill the back stack.
    setSearchParams(next, { replace: true });
  };

  const totalPages = tasks.data?.meta.totalPages ?? 1;

  return (
    <div className="stack">
      {stats.isSuccess && <StatsBar stats={stats.data} />}

      <section className="card">
        <header className="card-header"><h2>Add a task</h2></header>
        <div className="card-body">
          <TaskForm token={token!} />
        </div>
      </section>

      <section className="card">
        <header className="card-header">
          <h2>Your tasks</h2>
          {/* isFetching covers background refetches; isPending is only the
              first load. Showing the difference is what makes an app feel
              alive rather than janky. */}
          {tasks.isFetching && !tasks.isPending && <span className="lab-note">refreshing…</span>}
        </header>

        <div className="card-body stack">
          <div className="filters">
            <div className="field">
              <label htmlFor="search">Search</label>
              <input
                id="search"
                type="search"
                value={rawQuery}
                onChange={(e) => {
                  setRawQuery(e.target.value);
                  setParam('q', e.target.value);
                }}
                placeholder="Filter by title"
              />
            </div>

            <div className="field field-narrow">
              <label htmlFor="status">Status</label>
              <select id="status" value={status} onChange={(e) => setParam('status', e.target.value)}>
                <option value="all">All</option>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="field field-narrow">
              <label htmlFor="sort">Sort</label>
              <select id="sort" value={sort} onChange={(e) => setParam('sort', e.target.value)}>
                <option value="createdAt">Newest first</option>
                <option value="priority">Priority</option>
                <option value="dueDate">Due date</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>

          {/* ALL FOUR STATES. The one people forget is "loaded but empty",
              which is not the same as "still loading". */}
          {tasks.isPending && <p className="empty">Loading your tasks…</p>}

          {tasks.isError && (
            <div className="error-box" role="alert">
              <p>{tasks.error.message}</p>
              <button type="button" className="ghost" onClick={() => void tasks.refetch()}>
                Try again
              </button>
            </div>
          )}

          {tasks.isSuccess && tasks.data.data.length === 0 && (
            <p className="empty">
              {q || status !== 'all' ? 'No tasks match these filters.' : 'No tasks yet. Add one above.'}
            </p>
          )}

          {tasks.isSuccess && tasks.data.data.length > 0 && (
            // Dim while a newer page loads, rather than throwing the list away.
            <ul className="task-list" data-stale={tasks.isPlaceholderData}>
              {tasks.data.data.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={(nextStatus) => updateStatus.mutate({ id: task.id, status: nextStatus })}
                  onDelete={() => deleteTask.mutate(task.id)}
                />
              ))}
            </ul>
          )}

          {tasks.isSuccess && totalPages > 1 && (
            <div className="pager">
              <button
                type="button"
                className="ghost"
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
              >
                Previous
              </button>
              <span className="lab-note">
                Page {page} of {totalPages} &middot; {tasks.data.meta.total} tasks
              </span>
              <button
                type="button"
                className="ghost"
                disabled={page >= totalPages}
                onClick={() => setParam('page', String(page + 1))}
              >
                Next
              </button>
            </div>
          )}

          {(updateStatus.isError || deleteTask.isError) && (
            <p className="error" role="alert">
              That change failed and was rolled back:{' '}
              {(updateStatus.error ?? deleteTask.error)?.message}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

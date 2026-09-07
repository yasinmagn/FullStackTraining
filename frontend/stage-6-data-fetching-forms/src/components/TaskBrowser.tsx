import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { taskListQuery, useDeleteTask, useUpdateTaskStatus, prefetchTaskList } from '../api/queries.ts';
import type { TaskStatus } from '../api/schemas.ts';
import { useDebouncedValue } from '../hooks/useDebouncedValue.ts';

const PAGE_SIZE = 5;

export function TaskBrowser() {
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [rawQuery, setRawQuery] = useState('');
  const [page, setPage] = useState(1);

  /*
   * The input stays instant (local state) while the REQUEST waits for a pause.
   * Because the debounced value is part of the query key, no request is even
   * built for the intermediate keystrokes.
   */
  const query = useDebouncedValue(rawQuery, 300);
  const params = { status, query, page, pageSize: PAGE_SIZE };

  const tasks = useQuery(taskListQuery(params));
  const updateStatus = useUpdateTaskStatus(params);
  const deleteTask = useDeleteTask();

  const totalPages = Math.max(1, Math.ceil((tasks.data?.meta.total ?? 0) / PAGE_SIZE));

  return (
    <div className="stack">
      <div className="filters">
        <div className="field">
          <label htmlFor="browse-query">Search</label>
          <input
            id="browse-query"
            type="search"
            value={rawQuery}
            onChange={(event) => {
              setRawQuery(event.target.value);
              setPage(1); // a new filter invalidates the current page number
            }}
          />
        </div>

        <div className="field field-narrow">
          <label htmlFor="browse-status">Status</label>
          <select
            id="browse-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as TaskStatus | 'all');
              setPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      {/*
        THE FOUR STATES, all handled. This is the part hand-rolled fetching
        usually gets wrong - most commonly by forgetting that "loaded, but the
        list is empty" is different from "still loading".
      */}
      {tasks.isPending && <p className="empty">Loading tasks...</p>}

      {tasks.isError && (
        <div className="error-box" role="alert">
          <p>{tasks.error.message}</p>
          <button type="button" className="ghost" onClick={() => void tasks.refetch()}>
            Try again
          </button>
        </div>
      )}

      {tasks.isSuccess && tasks.data.data.length === 0 && (
        <p className="empty">No tasks match these filters.</p>
      )}

      {tasks.isSuccess && tasks.data.data.length > 0 && (
        // `isPlaceholderData` means we are showing the PREVIOUS result while a
        // new one loads. Dimming it beats a spinner that throws the list away.
        <ul className="task-list" data-stale={tasks.isPlaceholderData}>
          {tasks.data.data.map((task) => (
            <li key={task.id} className="task-item" data-done={task.status === 'done'}>
              <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={() =>
                  updateStatus.mutate({ id: task.id, status: task.status === 'done' ? 'todo' : 'done' })
                }
                aria-label={`Mark ${task.title} as done`}
              />
              <div className="task-main">
                <span className="task-title">{task.title}</span>
                {task.description && <p className="task-description">{task.description}</p>}
              </div>
              <span className="badge" data-tone={task.priority === 'high' ? 'danger' : 'neutral'}>
                {task.priority}
              </span>
              <button
                type="button"
                className="ghost"
                onClick={() => deleteTask.mutate(task.id)}
                disabled={deleteTask.isPending}
                aria-label={`Delete ${task.title}`}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pager">
        <button type="button" className="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span className="lab-note">
          Page {page} of {totalPages}
          {/*
            isFetching is true for BACKGROUND refetches too, where isPending is
            only true on the very first load. Showing the difference is what
            makes an app feel alive rather than janky.
          */}
          {tasks.isFetching && !tasks.isPending && ' - refreshing'}
        </span>
        <button
          type="button"
          className="ghost"
          disabled={page >= totalPages}
          // Prefetch on hover: by the time they click, it is already cached.
          onMouseEnter={() => void prefetchTaskList(queryClient, { ...params, page: page + 1 })}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {updateStatus.isError && (
        <p className="error" role="alert">
          Update failed and was rolled back: {updateStatus.error.message}
        </p>
      )}
    </div>
  );
}

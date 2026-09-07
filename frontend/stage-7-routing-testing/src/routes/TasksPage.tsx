import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QuickAdd } from '../components/QuickAdd.tsx';
import { addTask, fetchTasks, type TaskStatus } from '../data.ts';

const STATUS_OPTIONS: readonly (TaskStatus | 'all')[] = ['all', 'todo', 'in_progress', 'done'];

/**
 * THE URL IS STATE.
 *
 * Filters, sort order, the current page, an open tab - all of it belongs in the
 * query string rather than in `useState`, because the URL is the only piece of
 * state that:
 *
 *   - survives a refresh
 *   - can be bookmarked
 *   - can be shared with a colleague ("look at this filtered view")
 *   - works with the back button
 *   - is where a user already expects it to be
 *
 * `useSearchParams` has the same shape as `useState`, so the change is nearly
 * mechanical - and you get all of the above for free.
 */
export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const status = (searchParams.get('status') ?? 'all') as TaskStatus | 'all';

  const tasks = useQuery({
    queryKey: ['tasks', status],
    queryFn: () => fetchTasks(status),
  });

  return (
    <section className="card">
      <header className="card-header">
        <h2>Tasks</h2>
      </header>

      <div className="card-body stack">
        <QuickAdd
          onAdd={async (title) => {
            await addTask(title);
            await queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }}
        />

        <div className="segmented" role="group" aria-label="Filter by status">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="ghost"
              aria-pressed={status === option}
              onClick={() =>
                /*
                 * `replace: true` keeps the back button useful: flipping
                 * between four filters should not push four history entries the
                 * user has to click through to leave the page.
                 */
                setSearchParams(option === 'all' ? {} : { status: option }, { replace: true })
              }
            >
              {option.replace('_', ' ')}
            </button>
          ))}
        </div>

        {tasks.isPending && <p className="empty">Loading tasks...</p>}
        {tasks.isError && <p className="error" role="alert">Could not load tasks.</p>}
        {tasks.isSuccess && tasks.data.length === 0 && <p className="empty">No tasks with that status.</p>}

        {tasks.isSuccess && tasks.data.length > 0 && (
          <ul className="task-list">
            {tasks.data.map((task) => (
              <li key={task.id} className="task-item">
                {/*
                  <Link> renders a real <a href>. That matters: it works with
                  middle-click, cmd-click, "open in new tab", and it is
                  announced as a link. A <div onClick={navigate}> is none of
                  those things.
                */}
                <Link to={`/tasks/${task.id}`} className="task-main">
                  {task.title}
                </Link>
                <span className="badge" data-tone={task.priority === 'high' ? 'danger' : 'neutral'}>
                  {task.priority}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

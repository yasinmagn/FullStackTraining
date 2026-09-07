import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTask } from '../data.ts';

export function TaskDetailPage() {
  /*
   * `useParams` reads the dynamic segment from the route pattern
   * `/tasks/:taskId`.
   *
   * The type is `string | undefined` because TypeScript cannot know which route
   * rendered this component. Handle the undefined case rather than asserting -
   * it is exactly what happens when someone renders the component from the
   * wrong route.
   */
  const { taskId } = useParams<{ taskId: string }>();

  const task = useQuery({
    queryKey: ['tasks', 'detail', taskId],
    queryFn: () => fetchTask(taskId!),
    enabled: taskId !== undefined,
  });

  if (taskId === undefined) return <p className="error">No task id in the URL.</p>;

  return (
    <section className="card">
      <header className="card-header">
        <h2>{task.data?.title ?? 'Task'}</h2>
        <Link to="/" className="ghost nav-link">
          Back to list
        </Link>
      </header>

      <div className="card-body stack">
        {task.isPending && <p className="empty">Loading task...</p>}
        {task.isError && (
          <p className="error" role="alert">
            That task could not be loaded.
          </p>
        )}
        {task.isSuccess && (
          <>
            <p>{task.data.description}</p>
            <p className="lab-note">
              status: <code>{task.data.status}</code> &middot; priority: <code>{task.data.priority}</code>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

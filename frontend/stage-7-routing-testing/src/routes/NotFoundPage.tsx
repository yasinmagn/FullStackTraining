import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';

/**
 * One component serving as both the catch-all route AND the router's
 * errorElement.
 *
 * `useRouteError` returns whatever was thrown during matching, loading or
 * rendering. Without an errorElement, a thrown error unmounts the whole tree
 * and the user gets a blank white page - the worst possible failure mode
 * because it is indistinguishable from a crashed browser.
 */
export function NotFoundPage() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'That page does not exist.';

  return (
    <section className="card">
      <header className="card-header">
        <h2>Not found</h2>
      </header>
      <div className="card-body stack">
        <p role="alert">{message}</p>
        <p>
          <Link to="/">Back to the task list</Link>
        </p>
      </div>
    </section>
  );
}

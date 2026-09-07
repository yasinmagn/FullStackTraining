import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

/**
 * Serves as both the catch-all route and the router's errorElement.
 *
 * Without an errorElement a thrown error unmounts the whole tree and the user
 * gets a blank white page - the worst failure mode there is, because it is
 * indistinguishable from a crashed browser.
 */
export function NotFoundPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'That page does not exist.';

  return (
    <section className="card">
      <header className="card-header"><h2>Something went wrong</h2></header>
      <div className="card-body stack">
        <p role="alert">{message}</p>
        <p><Link to="/">Back to your tasks</Link></p>
      </div>
    </section>
  );
}

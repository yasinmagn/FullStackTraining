import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.tsx';

/** The chrome, rendered once. <Outlet /> is where the matched child goes. */
export function AppLayout() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="app">
      <header className="app-header app-bar">
        <div>
          <h1>Task Manager</h1>
          <p className="tagline">Final project &middot; React + PostgreSQL</p>
        </div>
        {isAuthenticated && (
          <div className="app-bar-actions">
            {user && <span className="lab-note">{user.displayName}</span>}
            <button type="button" className="ghost" onClick={logout}>Sign out</button>
          </div>
        )}
      </header>
      <Outlet />
    </div>
  );
}

/**
 * A PROTECTED ROUTE.
 *
 * Note `state={{ from }}`: it remembers where the user was heading so login can
 * send them back. Without it, following a deep link while signed out dumps
 * everyone on the home page after signing in.
 *
 * `replace` keeps the unauthenticated URL out of the history stack.
 *
 * This is a UX guard, NOT a security boundary. The API enforces access control
 * - a client-side check only decides what to render.
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Signed-in users have no business on the login page. */
export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

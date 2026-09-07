import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.tsx';
import { ApiError } from '../api/client.ts';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * Where to go after logging in.
   *
   * ProtectedRoute stashes the page the user was trying to reach, so a deep
   * link survives the login detour instead of dumping everyone on the home page.
   */
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      // `replace` so Back does not return to the login form after signing in.
      navigate(from, { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not sign in');
    } finally {
      // `finally`, so one failure does not lock the form forever.
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card auth-card">
      <header className="card-header"><h2>Sign in</h2></header>
      <form className="card-body stack" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          {/* autoComplete lets a password manager do its job. */}
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
          <Link to="/register" className="nav-link">Create an account</Link>
        </div>

        <p className="lab-note">
          Seeded demo account: <code>demo@example.com</code> / <code>demo-password-1234</code>
        </p>
      </form>
    </section>
  );
}

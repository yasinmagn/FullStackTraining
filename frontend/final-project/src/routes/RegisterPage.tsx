import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.tsx';
import { ApiError } from '../api/client.ts';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({ email: '', displayName: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      await register(values.email, values.displayName, values.password);
      navigate('/', { replace: true });
    } catch (cause) {
      /*
       * SERVER-SIDE field errors render under the right inputs.
       *
       * The API returns `error.details` keyed by field name, which is exactly
       * why it uses a consistent error envelope. Client validation is a
       * convenience; the server is the authority - it knows about uniqueness.
       */
      if (cause instanceof ApiError && cause.fieldErrors) setErrors(cause.fieldErrors);
      else setErrors({ _root: cause instanceof Error ? cause.message : 'Could not register' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card auth-card">
      <header className="card-header"><h2>Create an account</h2></header>
      <form className="card-body stack" onSubmit={handleSubmit} noValidate>
        <Field id="email" label="Email" error={errors.email}>
          <input id="email" type="email" value={values.email} onChange={set('email')}
            autoComplete="username"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined} />
        </Field>

        <Field id="displayName" label="Display name" error={errors.displayName}>
          <input id="displayName" value={values.displayName} onChange={set('displayName')}
            autoComplete="name"
            aria-invalid={errors.displayName ? true : undefined}
            aria-describedby={errors.displayName ? 'displayName-error' : undefined} />
        </Field>

        <Field id="password" label="Password (at least 12 characters)" error={errors.password}>
          <input id="password" type="password" value={values.password} onChange={set('password')}
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined} />
        </Field>

        {errors._root && <p className="error" role="alert">{errors._root}</p>}

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create account'}
          </button>
          <Link to="/login" className="nav-link">I already have an account</Link>
        </div>
      </form>
    </section>
  );
}

function Field({ id, label, error, children }: {
  id: string; label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {/* Always rendered, so aria-live has something to observe. */}
      <p className="error" id={`${id}-error`} aria-live="polite">{error ?? ''}</p>
    </div>
  );
}

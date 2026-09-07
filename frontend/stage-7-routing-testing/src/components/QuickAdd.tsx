import { useState, type FormEvent } from 'react';

interface QuickAddProps {
  onAdd: (title: string) => Promise<void>;
}

/**
 * A deliberately small component with everything a form test needs to exercise:
 * validation, an async submit, a disabled state, an announced error and a
 * success message.
 */
export function QuickAdd({ onAdd }: QuickAddProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmed = title.trim();
    if (trimmed.length < 3) {
      setError('Title needs at least 3 characters');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onAdd(trimmed);
      setTitle('');
      setSavedCount((count) => count + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save');
    } finally {
      // `finally` so the button is re-enabled on BOTH paths. Forget this and a
      // single failure locks the form forever.
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stack" noValidate>
      <div className="field">
        <label htmlFor="quick-title">New task</label>
        <input
          id="quick-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'quick-title-error' : undefined}
        />
        <p className="error" id="quick-title-error" aria-live="polite">
          {error ?? ''}
        </p>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Add task'}
        </button>
        {savedCount > 0 && (
          <span role="status" className="badge" data-tone="success">
            {savedCount} added
          </span>
        )}
      </div>
    </form>
  );
}

import { useState, type FormEvent } from 'react';
import { useCreateTask } from '../api/queries.ts';
import { ApiError } from '../api/fakeServer.ts';
import { EMPTY_FORM, createTaskSchema, toFieldErrors, type Priority, type TaskFormValues } from '../api/schemas.ts';

/**
 * A form, done properly and without a form library.
 *
 * Understanding this by hand is what lets you evaluate React Hook Form or
 * TanStack Form later, rather than cargo-culting one. The pieces are:
 *
 *   1. controlled inputs      - React owns the values
 *   2. validate on SUBMIT, then re-validate on change once a field has errored
 *   3. server errors merged into the same display as client errors
 *   4. the submit button disabled while in flight, so no double submits
 *   5. errors wired to inputs with aria-describedby / aria-invalid
 */
export function TaskForm() {
  const [values, setValues] = useState<TaskFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const createTask = useCreateTask();

  const setField = <K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) => {
    const next = { ...values, [field]: value };
    setValues(next);

    /*
     * Re-validate on change only AFTER the first submit attempt.
     *
     * Validating from the first keystroke means the user sees "Title needs at
     * least 3 characters" while typing the first character - technically true,
     * actively hostile. Validate on submit, then keep it live so they can see
     * the error clear as they fix it.
     */
    if (wasSubmitted) {
      const parsed = createTaskSchema.safeParse(next);
      setErrors(parsed.success ? {} : toFieldErrors(parsed.error));
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWasSubmitted(true);

    const parsed = createTaskSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    setErrors({});

    createTask.mutate(parsed.data, {
      onSuccess: () => {
        setValues(EMPTY_FORM);
        setWasSubmitted(false);
      },
      onError: (error) => {
        /*
         * SERVER-SIDE errors land in the same place as client-side ones.
         *
         * Client validation is a convenience. The server is the authority - it
         * knows about uniqueness, permissions and race conditions that the
         * browser cannot. Try adding a task titled "Learn TanStack Query"
         * twice: the client is happy, the server returns 409.
         */
        if (error instanceof ApiError && error.fieldErrors) {
          setErrors(error.fieldErrors);
        } else {
          setErrors({ _root: error instanceof Error ? error.message : 'Something went wrong' });
        }
      },
    });
  };

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <Field id="title" label="Title" error={errors.title}>
        <input
          id="title"
          value={values.title}
          onChange={(event) => setField('title', event.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'title-error' : undefined}
          autoComplete="off"
        />
      </Field>

      <Field id="description" label="Description" error={errors.description}>
        <textarea
          id="description"
          rows={2}
          value={values.description}
          onChange={(event) => setField('description', event.target.value)}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
      </Field>

      <div className="filters">
        <Field id="priority" label="Priority" error={errors.priority}>
          <select
            id="priority"
            value={values.priority}
            onChange={(event) => setField('priority', event.target.value as Priority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>

        <Field id="dueDate" label="Due date" error={errors.dueDate}>
          <input
            id="dueDate"
            type="date"
            value={values.dueDate}
            onChange={(event) => setField('dueDate', event.target.value)}
            aria-invalid={errors.dueDate ? true : undefined}
            aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
          />
        </Field>
      </div>

      {/*
        A form-level error, announced when it appears. role="alert" is
        assertive - right for "your submission failed", wrong for a field hint.
      */}
      {errors._root && (
        <p className="error" role="alert">
          {errors._root}
        </p>
      )}

      <div className="form-actions">
        {/* Disabled while in flight: the cheapest fix for double submits. */}
        <button type="submit" disabled={createTask.isPending}>
          {createTask.isPending ? 'Saving...' : 'Add task'}
        </button>
        {createTask.isSuccess && !createTask.isPending && (
          <span className="badge" data-tone="success" role="status">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {/*
        The error paragraph exists whether or not there is an error, so
        aria-live has something to observe. `id` matches the input's
        aria-describedby, which is what makes a screen reader read the message
        when focus lands on the field.
      */}
      <p className="error" id={`${id}-error`} aria-live="polite">
        {error ?? ''}
      </p>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ApiError, type Priority } from '../api/client.ts';
import { useCreateTask } from '../api/queries.ts';

/**
 * The FORM schema, deliberately not the entity schema.
 *
 * A form is edited by a human, so its rules are about human input: an empty
 * string means "absent", not "invalid".
 */
const formSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().max(2000).transform((v) => (v === '' ? null : v)),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Due date must be YYYY-MM-DD'),
});

const EMPTY = { title: '', description: '', priority: 'medium' as Priority, dueDate: '' };

export function TaskForm({ token }: { token: string }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const createTask = useCreateTask(token);

  const setField = (field: keyof typeof values, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);

    /*
     * Re-validate on change only AFTER the first submit.
     *
     * Validating from the first keystroke shows "Title must be at least 3
     * characters" while the user types the first character - technically true,
     * actively hostile.
     */
    if (wasSubmitted) {
      const parsed = formSchema.safeParse(next);
      setErrors(parsed.success ? {} : fieldErrors(parsed.error));
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setWasSubmitted(true);

    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});

    createTask.mutate(parsed.data, {
      onSuccess: () => {
        setValues(EMPTY);
        setWasSubmitted(false);
      },
      onError: (error) => {
        // Server-side errors land in the SAME place as client-side ones. Try
        // adding two tasks with the same title: the client is happy, the
        // server returns 409 with details.title.
        if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
        else setErrors({ _root: error.message });
      },
    });
  };

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="new-title">Title</label>
        <input
          id="new-title"
          value={values.title}
          onChange={(e) => setField('title', e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'new-title-error' : undefined}
          autoComplete="off"
        />
        <p className="error" id="new-title-error" aria-live="polite">{errors.title ?? ''}</p>
      </div>

      <div className="field">
        <label htmlFor="new-description">Description</label>
        <textarea
          id="new-description"
          rows={2}
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
        />
      </div>

      <div className="filters">
        <div className="field field-narrow">
          <label htmlFor="new-priority">Priority</label>
          <select
            id="new-priority"
            value={values.priority}
            onChange={(e) => setField('priority', e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="field field-narrow">
          <label htmlFor="new-due">Due date</label>
          <input
            id="new-due"
            type="date"
            value={values.dueDate}
            onChange={(e) => setField('dueDate', e.target.value)}
            aria-invalid={errors.dueDate ? true : undefined}
          />
        </div>
      </div>

      {errors._root && <p className="error" role="alert">{errors._root}</p>}

      <div className="form-actions">
        {/* Disabled while in flight: the cheapest fix for double submits. */}
        <button type="submit" disabled={createTask.isPending}>
          {createTask.isPending ? 'Saving…' : 'Add task'}
        </button>
      </div>
    </form>
  );
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const output: Record<string, string> = {};
  // First message per field only - four complaints about one input is noise.
  for (const issue of error.issues) output[issue.path.join('.') || '_root'] ??= issue.message;
  return output;
}

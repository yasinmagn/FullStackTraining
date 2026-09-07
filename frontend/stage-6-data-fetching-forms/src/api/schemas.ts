import { z } from 'zod';

/**
 * Stage 3 hand-rolled a parser to show the mechanics. This is how you do it in
 * real code.
 *
 * One schema gives you BOTH the runtime check and the static type, so they can
 * never drift apart:
 *
 *   const taskSchema = z.object({ ... });
 *   type Task = z.infer<typeof taskSchema>;
 */

export const prioritySchema = z.enum(['low', 'medium', 'high']);
export const statusSchema = z.enum(['todo', 'in_progress', 'done']);

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: prioritySchema,
  status: statusSchema,
  dueDate: z.iso.date().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const taskListSchema = z.object({
  data: z.array(taskSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  }),
});

/**
 * The FORM schema, which is deliberately not the same as the entity schema.
 *
 * A form is edited by a human, so its rules are about human input: minimum
 * length, a friendly message, an empty string meaning "not provided". The
 * entity schema describes what the server sends back. Conflating the two is how
 * you end up validating `createdAt` on a create form.
 */
export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title needs at least 3 characters')
    .max(200, 'Title must be 200 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or fewer')
    // An untouched textarea gives '' - that means "absent", not "invalid".
    .transform((value) => (value === '' ? null : value))
    .nullable(),
  priority: prioritySchema,
  dueDate: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .refine(
      (value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value),
      'Due date must be YYYY-MM-DD',
    ),
});

export type Priority = z.infer<typeof prioritySchema>;
export type TaskStatus = z.infer<typeof statusSchema>;
export type Task = z.infer<typeof taskSchema>;
export type TaskList = z.infer<typeof taskListSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Raw form values are all strings - that is what an <input> gives you. */
export interface TaskFormValues {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
}

export const EMPTY_FORM: TaskFormValues = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
};

/**
 * Flatten zod issues into `{ fieldName: message }` for rendering.
 *
 * Only the FIRST error per field is kept - showing a user four complaints about
 * one input at once is noise.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.') || '_root';
    errors[field] ??= issue.message;
  }
  return errors;
}

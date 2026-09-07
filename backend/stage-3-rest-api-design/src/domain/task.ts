import { z } from 'zod';

/**
 * THE DOMAIN LAYER.
 *
 * Types and rules that would still make sense if this app were a CLI, a queue
 * worker or a desktop program. Notice what is absent: no Express, no HTTP
 * status codes, no SQL. Nothing here knows how it is being called.
 *
 * That is the point of layering. The domain is the part you keep.
 */

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export const STATUSES = ['todo', 'in_progress', 'done'] as const;

export const prioritySchema = z.enum(PRIORITIES);
export const statusSchema = z.enum(STATUSES);

export type Priority = z.infer<typeof prioritySchema>;
export type TaskStatus = z.infer<typeof statusSchema>;

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly priority: Priority;
  readonly status: TaskStatus;
  readonly dueDate: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// --- Input schemas ---------------------------------------------------------
//
// One schema per OPERATION, not one per entity. Create and update have
// genuinely different rules, and pretending otherwise is how you end up with
// `Partial<Task>` everywhere and no validation worth the name.

/**
 * Field validators, defined once and shared by both operations.
 *
 * Sharing the FIELDS rather than the whole schema is deliberate - see the note
 * on `updateTaskSchema` below for what goes wrong if you derive one operation
 * from the other.
 */
const titleField = z.string().trim().min(3, 'Title must be at least 3 characters').max(200);
const descriptionField = z.string().trim().max(2000).nullable();
const dueDateField = z.iso.date().nullable();

export const createTaskSchema = z.object({
  title: titleField,
  // Absent and explicit null both mean "no description".
  description: descriptionField.optional().transform((v) => v ?? null),
  priority: prioritySchema.default('medium'),
  dueDate: dueDateField.optional().transform((v) => v ?? null),
});

/**
 * Update: every field optional, plus `status`.
 *
 * WHY THIS IS WRITTEN OUT rather than `createTaskSchema.partial()`.
 *
 * `.partial()` marks fields optional but does NOT remove their `.default()` or
 * `.transform()`. So `createTaskSchema.partial().parse({})` returns
 * `{ priority: 'medium', description: null, dueDate: null }` - an object with
 * three keys - and the "at least one field" check below would never fire.
 *
 * Worse, a PATCH with no body would silently null out the description.
 *
 * Deriving types is good (frontend Stage 3); deriving PARSERS across operations
 * with different defaults is a trap. Share the field validators instead.
 */
export const updateTaskSchema = z
  .object({
    title: titleField.optional(),
    description: descriptionField.optional(),
    priority: prioritySchema.optional(),
    dueDate: dueDateField.optional(),
    status: statusSchema.optional(),
  })
  /*
   * Reject `PATCH {}`.
   *
   * An empty patch is almost always a client bug - a form that sent nothing, or
   * a field name that got renamed. Silently returning 200 hides it; a 400
   * surfaces it while someone is still looking at the code.
   */
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

/**
 * Query parameters.
 *
 * Everything in a query string is a STRING. `z.coerce` converts before
 * validating, which is why `?page=2` becomes the number 2 rather than failing
 * a `z.number()` check.
 */
export const listTasksQuerySchema = z.object({
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),

  page: z.coerce.number().int().positive().default(1),
  /*
   * A MAXIMUM page size is a security control, not a nicety. Without it,
   * `?pageSize=1000000` lets any client ask your database for everything at
   * once - a denial-of-service you built yourself.
   */
  pageSize: z.coerce.number().int().positive().max(100).default(20),

  sort: z.enum(['createdAt', 'dueDate', 'priority', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

/** A paginated result. Shared by every list endpoint, so clients learn it once. */
export interface Page<T> {
  readonly data: readonly T[];
  readonly meta: {
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
  };
}

/**
 * A domain rule, expressed once.
 *
 * Business rules belong here rather than in a route handler, because they are
 * true regardless of who is asking. Put this in the HTTP layer and the CLI, the
 * importer and the background job each get their own slightly different copy.
 */
export function canTransitionTo(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  // A finished task must be reopened to 'todo' before work restarts on it.
  if (from === 'done' && to === 'in_progress') return false;
  return true;
}

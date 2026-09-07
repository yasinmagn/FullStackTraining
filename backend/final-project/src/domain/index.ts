import { z } from 'zod';

/**
 * THE DOMAIN.
 *
 * Types, schemas and pure rules. No express, no pg, no HTTP status codes.
 * Everything here would still make sense if this were a CLI or a queue worker.
 */

// --- Errors ----------------------------------------------------------------

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} was not found`);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, readonly details: Record<string, string> = {}) {
    super(message);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, readonly details: Record<string, string> = {}) {
    super(message);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Authentication required') {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super(message);
  }
}

// --- Entities --------------------------------------------------------------

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export const STATUSES = ['todo', 'in_progress', 'done'] as const;
export const ROLES = ['user', 'admin'] as const;

export const prioritySchema = z.enum(PRIORITIES);
export const statusSchema = z.enum(STATUSES);
export const roleSchema = z.enum(ROLES);

export type Priority = z.infer<typeof prioritySchema>;
export type TaskStatus = z.infer<typeof statusSchema>;
export type Role = z.infer<typeof roleSchema>;

export interface User {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: Role;
  readonly createdAt: string;
}

/** The internal shape, including the hash. Never leaves the service layer. */
export interface UserWithPassword extends User {
  readonly passwordHash: string;
}

export interface Task {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly description: string | null;
  readonly priority: Priority;
  readonly status: TaskStatus;
  readonly dueDate: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
}

// --- Input schemas ---------------------------------------------------------
//
// Field validators are shared; each OPERATION gets its own schema.
// (Deriving update from create with `.partial()` keeps create's defaults and
// transforms - see the Stage 3 lesson for why that is a trap.)

const titleField = z.string().trim().min(3, 'Title must be at least 3 characters').max(200);
const descriptionField = z.string().trim().max(2000).nullable();
const dueDateField = z.iso.date('Due date must be YYYY-MM-DD').nullable();

export const createTaskSchema = z.object({
  title: titleField,
  description: descriptionField.optional().transform((v) => v ?? null),
  priority: prioritySchema.default('medium'),
  dueDate: dueDateField.optional().transform((v) => v ?? null),
  /*
   * NOTE WHAT IS ABSENT: ownerId, status, id, createdAt.
   *
   * Everything the SERVER owns is missing from the schema, so zod strips it if
   * a client sends it. This is the mass-assignment defence, and there is a test.
   */
});

export const updateTaskSchema = z
  .object({
    title: titleField.optional(),
    description: descriptionField.optional(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
    dueDate: dueDateField.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listTasksQuerySchema = z.object({
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  // A hard maximum is a security control: without it, ?pageSize=1000000 lets
  // any client ask the database for everything at once.
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['createdAt', 'dueDate', 'priority', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const registerSchema = z.object({
  email: z.email('Enter a valid email address').max(255),
  displayName: z.string().trim().min(1).max(100),
  // Length, not composition (NIST SP 800-63B). 72 bytes is bcrypt's limit.
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password is too long'),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface Page<T> {
  readonly data: readonly T[];
  readonly meta: {
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
  };
}

// --- Business rules --------------------------------------------------------

/**
 * A finished task must be reopened to 'todo' before work restarts on it.
 *
 * Expressed here, once, because it is true regardless of who is asking. Put it
 * in a route handler and the CLI, the importer and the background job each get
 * their own slightly different copy.
 */
export function canTransitionTo(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  if (from === 'done' && to === 'in_progress') return false;
  return true;
}

/**
 * `completed_at` is derived from status, and the database has a CHECK
 * constraint enforcing exactly this pairing. Keeping the rule in one function
 * means the application and the constraint cannot disagree.
 */
export function completedAtFor(status: TaskStatus, existing: string | null): string | null {
  if (status !== 'done') return null;
  // Preserve the original completion time when a done task is edited.
  return existing ?? new Date().toISOString();
}

/**
 * Modelling the domain so that illegal states cannot be represented.
 *
 * The point of TypeScript is not "JavaScript with annotations". It is a design
 * tool: if your types are shaped correctly, whole categories of bug become
 * unwriteable rather than merely untested.
 */

// --- 1. Union types instead of strings ------------------------------------
//
// `priority: string` lets someone write 'hgih'. This does not.

export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

/**
 * A branded type. `TaskId` is a string at runtime with zero cost, but the
 * compiler refuses to let you pass a `UserId` (or a bare string) where a
 * `TaskId` is expected.
 *
 * This kills the "arguments in the wrong order" bug for good:
 *   moveTask(userId, taskId)  // now a compile error
 */
declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type TaskId = Brand<string, 'TaskId'>;
export type UserId = Brand<string, 'UserId'>;

/** The only sanctioned way to make a TaskId - validation lives in one place. */
export function taskId(value: string): TaskId {
  if (!/^[0-9a-f-]{36}$/i.test(value)) {
    throw new TypeError(`Invalid TaskId: ${value}`);
  }
  return value as TaskId;
}

// --- 2. readonly by default -----------------------------------------------
//
// `readonly` is compile-time only, but it makes accidental mutation a build
// error - which is where you want to find it.

export interface Task {
  readonly id: TaskId;
  readonly title: string;
  readonly description: string | null;
  readonly priority: Priority;
  readonly status: TaskStatus;
  readonly assigneeId: UserId | null;
  readonly dueDate: string | null; // ISO-8601 date
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * `readonly Task[]` prevents `tasks.push(...)` at compile time. Prefer it for
 * every function parameter you do not intend to modify - it documents intent
 * and catches accidental mutation.
 */
export type TaskList = readonly Task[];

// --- 3. Discriminated unions ----------------------------------------------
//
// The single most valuable pattern in TypeScript.
//
// The WRONG way - four booleans give 16 combinations, 12 of them nonsense:
//   { isLoading: boolean; isError: boolean; data?: T; error?: Error }
//   ...what does { isLoading: true, isError: true, data: x } even mean?
//
// The right way: one `state` field the compiler can narrow on. Four states,
// exactly four, and `data` only exists where it makes sense.

export type RemoteData<T, E = Error> =
  | { readonly state: 'idle' }
  | { readonly state: 'loading' }
  | { readonly state: 'success'; readonly data: T }
  | { readonly state: 'failure'; readonly error: E };

/**
 * Narrowing in action. Inside each branch TypeScript knows exactly which
 * variant you have, so `result.data` is available in `success` and a compile
 * error anywhere else.
 */
export function describeRemoteData<T>(result: RemoteData<T>): string {
  switch (result.state) {
    case 'idle':
      return 'Not started';
    case 'loading':
      return 'Loading...';
    case 'success':
      return `Loaded ${JSON.stringify(result.data)}`;
    case 'failure':
      return `Failed: ${result.error.message}`;
    default:
      // Exhaustiveness check. Add a fifth variant to RemoteData and this line
      // stops compiling - the compiler tells you every switch you must update.
      return assertNever(result);
  }
}

/**
 * `never` is the type with no values. Anything reaching here is, by
 * construction, impossible - so assigning it to `never` only type-checks when
 * you really have handled every case.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}

// --- 4. Utility types ------------------------------------------------------
//
// Derive types from one source of truth instead of writing them out again.
// Every hand-copied duplicate is a place the two can drift apart.

/** What a client sends to create a task. */
export type CreateTaskInput = Pick<Task, 'title' | 'priority'> &
  Partial<Pick<Task, 'description' | 'dueDate' | 'assigneeId'>>;

/** What a client sends to update one. Everything optional except identity. */
export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>;

/** A mutable draft, e.g. while a form is being edited. */
export type TaskDraft = { -readonly [K in keyof CreateTaskInput]: CreateTaskInput[K] };

/** Rows exactly as PostgreSQL returns them - snake_case, Date objects. */
export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  assignee_id: string | null;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * The boundary between "database shape" and "application shape".
 *
 * Keeping this in one function means a column rename touches exactly one file
 * instead of every component that happened to read `created_at`.
 */
export function toTask(row: TaskRow): Task {
  return {
    id: row.id as TaskId,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assigneeId: (row.assignee_id as UserId | null) ?? null,
    dueDate: row.due_date?.toISOString().slice(0, 10) ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// --- 5. `satisfies` --------------------------------------------------------
//
// `as const satisfies X` checks the value against X *without* widening it, so
// you get validation AND precise literal types.

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
} as const satisfies Record<Priority, string>;

// Type is 'Low' | 'Medium' | 'High', not `string`.
export type PriorityLabel = (typeof PRIORITY_LABELS)[Priority];

/**
 * Compare with a plain annotation:
 *
 *   const LABELS: Record<Priority, string> = { ... }
 *   LABELS.low  // widened to `string` - you lost the literal
 *
 * And with no annotation at all:
 *
 *   const LABELS = { low: 'Low' }   // no error for the missing keys
 *
 * `satisfies` gives you both halves.
 */

// --- 6. Generics -----------------------------------------------------------

/**
 * Index a list by a chosen key.
 *
 * `K extends keyof T` constrains the key to one that actually exists, and
 * `T[K] extends string` keeps the resulting index usable as an object key.
 */
export function indexBy<T, K extends keyof T>(
  items: readonly T[],
  key: K,
): Map<T[K], T> {
  return new Map(items.map((item) => [item[key], item]));
}

/** A type predicate: tells the compiler what the boolean *means*. */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return value === 'todo' || value === 'in_progress' || value === 'done';
}

/**
 * Filter out null and undefined AND tell the compiler you did.
 *
 *   const ids = maybeIds.filter(isPresent);   // string[], not (string|null)[]
 */
export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

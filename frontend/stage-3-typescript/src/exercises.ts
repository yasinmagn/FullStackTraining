/**
 * Stage 3 exercises.
 *
 * 1. In `exercises.test.ts`, change `describe.skip` to `describe`.
 * 2. `npm run test:watch --workspace frontend-stage-3-typescript`
 * 3. Also keep `npm run typecheck --workspace frontend-stage-3-typescript` green
 *    - several of these are as much about the TYPES as the runtime behaviour.
 *
 * Solutions in SOLUTIONS.md.
 */

import type { Priority, Task } from './domain.js';
import type { Result } from './validation.js';

const todo = (name: string): never => {
  throw new Error(`Not implemented: ${name}. See src/exercises.ts`);
};

/**
 * EXERCISE 1 - `sortBy`
 *
 * Sort a readonly array by a key, without mutating it.
 *
 * The type challenge: `key` must be constrained to keys of `T` whose VALUE is
 * comparable (string or number). `sortBy(tasks, 'title')` should compile;
 * `sortBy(tasks, 'nope')` should not.
 *
 * Hint: a mapped/conditional type such as
 *   type ComparableKeys<T> = { [K in keyof T]: T[K] extends string | number ? K : never }[keyof T]
 */
export function sortBy<T>(items: readonly T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return todo('sortBy');
}

/**
 * EXERCISE 2 - `partition`
 *
 * Split a list in two by a predicate. Return a tuple, not an object, so
 * callers can destructure positionally:
 *
 *   const [done, open] = partition(tasks, t => t.status === 'done');
 *
 * The return type should be `[T[], T[]]` (a tuple), not `T[][]`.
 */
export function partition<T>(items: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  return todo('partition');
}

/**
 * EXERCISE 3 - `mapResult`
 *
 * Transform the success value of a `Result`, leaving a failure untouched.
 * This is what makes Result composable instead of a pile of if-statements.
 *
 *   mapResult(parseTitle(input), title => title.toUpperCase())
 */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return todo('mapResult');
}

/**
 * EXERCISE 4 - `deepFreeze`
 *
 * Recursively `Object.freeze` an object and everything it contains.
 *
 * The type challenge: the return type should be a recursive
 * `DeepReadonly<T>`, not just `Readonly<T>`. Define that type yourself.
 */
export function deepFreeze<T>(value: T): T {
  return todo('deepFreeze');
}

/**
 * EXERCISE 5 - `groupTasksByStatus`
 *
 * Return `Record<TaskStatus, Task[]>` where EVERY status key is present, even
 * when its bucket is empty. The type must not be `Partial<...>` - a caller
 * should be able to write `groups.done.length` with no optional chaining.
 */
export function groupTasksByStatus(tasks: readonly Task[]): Record<Task['status'], Task[]> {
  return todo('groupTasksByStatus');
}

/**
 * EXERCISE 6 - `comparePriority`
 *
 * A comparator so `[...tasks].sort(comparePriority)` puts high first.
 *
 * The type challenge: define the rank lookup with
 * `as const satisfies Record<Priority, number>` so that adding a fourth
 * priority to the union is a compile error here.
 */
export function comparePriority(a: { priority: Priority }, b: { priority: Priority }): number {
  return todo('comparePriority');
}

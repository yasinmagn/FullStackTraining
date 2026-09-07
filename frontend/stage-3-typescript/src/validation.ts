/**
 * "Parse, don't validate."
 *
 * A validator answers a yes/no question and hands you back the same `unknown`
 * you started with. A parser hands you back a *narrower type*. After you call
 * a parser, the compiler knows the data is good - you cannot forget to check.
 *
 * Everything crossing your program's boundary is `unknown`: HTTP responses,
 * localStorage, URL params, form data, `JSON.parse`. Typing it as `any` and
 * hoping is how production breaks at 2am.
 *
 * We hand-roll a tiny parser here so the mechanics are visible. In real work
 * use `zod` - Backend Stage 3 does exactly that.
 */

import type { CreateTaskInput, Priority, TaskStatus } from './domain.js';

// --- The Result type ------------------------------------------------------
//
// Errors as values rather than exceptions. The caller cannot ignore a failure,
// because they have to narrow on `ok` before they can reach `.value`.

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = ValidationError[]> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export interface ValidationError {
  /** Dotted path to the offending field, e.g. `dueDate` or `items.0.title`. */
  readonly path: string;
  readonly message: string;
}

// --- Primitive parsers ----------------------------------------------------

/**
 * `unknown` is the honest type for untrusted input. It is like `any` except the
 * compiler refuses to let you *do* anything with it until you have narrowed it,
 * which is precisely the safety you want.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  // typeof null === 'object', which is a 30-year-old JavaScript wart.
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high'];
const STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];

function parseString(
  value: unknown,
  path: string,
  { min = 0, max = Number.MAX_SAFE_INTEGER, trim = true } = {},
): Result<string> {
  if (typeof value !== 'string') return err([{ path, message: 'must be a string' }]);

  const candidate = trim ? value.trim() : value;

  if (candidate.length < min) return err([{ path, message: `must be at least ${min} characters` }]);
  if (candidate.length > max) return err([{ path, message: `must be at most ${max} characters` }]);

  return ok(candidate);
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[], path: string): Result<T> {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return ok(value as T);
  }
  return err([{ path, message: `must be one of: ${allowed.join(', ')}` }]);
}

function parseIsoDate(value: unknown, path: string): Result<string> {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return err([{ path, message: 'must be an ISO date (YYYY-MM-DD)' }]);
  }
  // The regex passes for 2026-02-31. Only Date can tell you it is not a day.
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || !date.toISOString().startsWith(value)) {
    return err([{ path, message: 'is not a real calendar date' }]);
  }
  return ok(value);
}

// --- The composite parser -------------------------------------------------

/**
 * Parse untrusted input into a `CreateTaskInput`.
 *
 * Note the return type: after a successful call the caller HAS a
 * `CreateTaskInput`. There is no way to reach the value without checking `ok`
 * first, so the check cannot be forgotten.
 *
 * Note also that it collects ALL the errors rather than throwing on the first
 * one. A form that reports one problem per submit is a bad form.
 */
export function parseCreateTaskInput(input: unknown): Result<CreateTaskInput> {
  if (!isRecord(input)) {
    return err([{ path: '', message: 'expected an object' }]);
  }

  const errors: ValidationError[] = [];

  const title = parseString(input.title, 'title', { min: 3, max: 200 });
  if (!title.ok) errors.push(...title.error);

  const priority = parseEnum(input.priority ?? 'medium', PRIORITIES, 'priority');
  if (!priority.ok) errors.push(...priority.error);

  let description: string | undefined;
  if (input.description !== undefined && input.description !== null) {
    const parsed = parseString(input.description, 'description', { max: 2000 });
    if (parsed.ok) description = parsed.value;
    else errors.push(...parsed.error);
  }

  let dueDate: string | undefined;
  if (input.dueDate !== undefined && input.dueDate !== null) {
    const parsed = parseIsoDate(input.dueDate, 'dueDate');
    if (parsed.ok) dueDate = parsed.value;
    else errors.push(...parsed.error);
  }

  if (errors.length > 0) return err(errors);

  // Inside this branch the compiler still sees `title` as a Result, so we
  // narrow once more. `title.ok` is guaranteed here because errors is empty.
  return ok({
    title: title.ok ? title.value : '',
    priority: priority.ok ? priority.value : 'medium',
    ...(description !== undefined && { description }),
    ...(dueDate !== undefined && { dueDate }),
  });
}

/**
 * `JSON.parse` returns `any`, which silently disables type checking for
 * everything downstream. Returning `unknown` forces the caller to parse.
 */
export function parseJson(text: string): Result<unknown, ValidationError[]> {
  try {
    return ok(JSON.parse(text) as unknown);
  } catch (cause) {
    return err([{ path: '', message: cause instanceof Error ? cause.message : 'invalid JSON' }]);
  }
}

/** Convenience: unwrap or throw. Use at the top of a request handler. */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value;
  const detail = result.error.map((e) => `${e.path || '(root)'}: ${e.message}`).join('; ');
  throw new Error(`Validation failed - ${detail}`);
}

export { STATUSES, PRIORITIES };

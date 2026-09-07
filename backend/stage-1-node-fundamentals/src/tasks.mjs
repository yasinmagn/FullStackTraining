/**
 * Reading and summarising task data from disk.
 *
 * Three Node habits worth forming here:
 *   1. `node:` prefixed imports
 *   2. promise-based `fs/promises`, never the sync or callback variants
 *   3. path handling that works on Windows as well as Linux
 */

// The `node:` prefix says "this is a builtin, not a package from npm". It is
// unambiguous, slightly faster to resolve, and immune to a dependency called
// `fs` shadowing the real thing.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `__dirname` and `__filename` DO NOT EXIST in ES modules.
 *
 * This is the ESM replacement, and it is worth understanding rather than
 * copy-pasting: `import.meta.url` is a file:// URL, and `fileURLToPath` turns it
 * into an OS path - correctly on Windows, where a naive `.replace('file://','')`
 * leaves you with `/C:/Users/...` and a confusing ENOENT.
 */
export const moduleDir = dirname(fileURLToPath(import.meta.url));

/**
 * Build a path from segments.
 *
 * ALWAYS use `join`/`resolve` rather than string concatenation with '/'.
 * Windows uses backslashes, and `'data' + '/' + 'tasks.json'` is the reason so
 * many Node tools only work on macOS.
 *
 * @param {...string} segments
 */
export const fromModule = (...segments) => join(moduleDir, ...segments);

/**
 * Read and parse a JSON file.
 *
 * Note how each failure mode gets its own message. "Unexpected token < in JSON
 * at position 0" tells a user nothing; "not valid JSON" plus the path tells
 * them exactly what to look at.
 *
 * @param {string} filePath
 * @returns {Promise<unknown>}
 */
export async function readJsonFile(filePath) {
  const absolute = resolve(filePath);

  let text;
  try {
    // Passing the encoding gives you a string. Omit it and you get a Buffer -
    // which is what you want for binary data, and not what you want here.
    text = await readFile(absolute, 'utf8');
  } catch (cause) {
    // Node errors carry a machine-readable `code`. Branch on that, never on
    // the message - messages change between versions.
    if (cause.code === 'ENOENT') {
      throw new Error(`File not found: ${absolute}`, { cause });
    }
    if (cause.code === 'EACCES') {
      throw new Error(`Permission denied reading: ${absolute}`, { cause });
    }
    throw cause;
  }

  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new Error(`${absolute} is not valid JSON`, { cause });
  }
}

/**
 * Write JSON, creating parent directories as needed.
 *
 * @param {string} filePath
 * @param {unknown} data
 */
export async function writeJsonFile(filePath, data) {
  const absolute = resolve(filePath);
  // `recursive: true` makes this `mkdir -p`: no error if it already exists.
  await mkdir(dirname(absolute), { recursive: true });
  // The trailing newline is a POSIX convention; without it `cat` output runs
  // into your shell prompt and git marks the file as having no newline at EOF.
  await writeFile(absolute, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return absolute;
}

const VALID_STATUSES = new Set(['todo', 'in_progress', 'done']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

/**
 * Validate untrusted input from disk.
 *
 * A file on disk is EXTERNAL INPUT, exactly like an HTTP body. Someone edited it
 * by hand, an old version of your tool wrote it, or it is half-written because
 * the process was killed mid-write. Parse it; do not assume it.
 *
 * @param {unknown} value
 * @returns {{ id: string, title: string, priority: string, status: string, estimateHours: number }[]}
 */
export function parseTasks(value) {
  if (!Array.isArray(value)) {
    throw new TypeError('Expected the tasks file to contain an array');
  }

  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new TypeError(`Task at index ${index} is not an object`);
    }
    const { id, title, priority, status, estimateHours } = item;

    if (typeof id !== 'string' || id === '') throw new TypeError(`Task at index ${index} has no id`);
    if (typeof title !== 'string' || title === '') throw new TypeError(`Task ${id} has no title`);
    if (!VALID_PRIORITIES.has(priority)) throw new TypeError(`Task ${id} has an invalid priority: ${priority}`);
    if (!VALID_STATUSES.has(status)) throw new TypeError(`Task ${id} has an invalid status: ${status}`);
    if (typeof estimateHours !== 'number' || !Number.isFinite(estimateHours)) {
      throw new TypeError(`Task ${id} has an invalid estimateHours: ${estimateHours}`);
    }

    return { id, title, priority, status, estimateHours };
  });
}

/**
 * Summarise a task list. A pure function - no I/O - so it is trivial to test.
 *
 * @param {ReturnType<typeof parseTasks>} tasks
 */
export function summarise(tasks) {
  const byStatus = { todo: 0, in_progress: 0, done: 0 };
  let totalHours = 0;
  let remainingHours = 0;

  for (const task of tasks) {
    byStatus[task.status] += 1;
    totalHours += task.estimateHours;
    if (task.status !== 'done') remainingHours += task.estimateHours;
  }

  return {
    total: tasks.length,
    byStatus,
    // Floating point: 1.5 + 2 + 1 + 3 + 0.5 can land on 7.999999999999999.
    // Round at the boundary where the number is presented.
    totalHours: Math.round(totalHours * 100) / 100,
    remainingHours: Math.round(remainingHours * 100) / 100,
    percentComplete: tasks.length === 0 ? 0 : Math.round((byStatus.done / tasks.length) * 100),
  };
}

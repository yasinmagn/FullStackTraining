/**
 * Working with arrays and objects *without mutating them*.
 *
 * This is not stylistic preference. React, Redux, TanStack Query and Vue all
 * detect change by comparing references (`prev !== next`). Mutate an array in
 * place and the reference never changes, so the UI never updates. You will hit
 * this bug in Stage 5; learn the escape hatch now.
 *
 * @typedef {{ id: string, title: string, priority: 'low'|'medium'|'high', done: boolean }} Task
 */

/**
 * Add a task, returning a NEW array.
 *
 * `[...list, item]` is the whole trick. Compare with `list.push(item)`, which
 * returns a number and leaves the original array's identity unchanged.
 *
 * @param {Task[]} tasks
 * @param {Task} task
 * @returns {Task[]}
 */
export function addTask(tasks, task) {
  return [...tasks, task];
}

/**
 * Replace one task by id, returning a NEW array with NEW objects only where
 * something actually changed.
 *
 * Note `{ ...task, ...changes }`: unchanged tasks keep their original object
 * reference, which lets React skip re-rendering those rows.
 *
 * @param {Task[]} tasks
 * @param {string} id
 * @param {Partial<Task>} changes
 * @returns {Task[]}
 */
export function updateTask(tasks, id, changes) {
  return tasks.map((task) => (task.id === id ? { ...task, ...changes } : task));
}

/**
 * Remove a task by id.
 *
 * @param {Task[]} tasks
 * @param {string} id
 * @returns {Task[]}
 */
export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

/**
 * Sort by priority (high first), then title A-Z.
 *
 * `.sort()` mutates and returns the SAME array. `.toSorted()` (ES2023) returns
 * a copy. If you are on an older runtime, `[...tasks].sort(...)` does the same
 * job.
 *
 * @param {Task[]} tasks
 * @returns {Task[]}
 */
export function sortByPriority(tasks) {
  const rank = { high: 0, medium: 1, low: 2 };
  return tasks.toSorted((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title));
}

/**
 * Group tasks into `{ low: [...], medium: [...], high: [...] }`.
 *
 * `reduce` is the general-purpose fold: start with an accumulator and combine
 * one element at a time. Most `reduce` calls you see in the wild would be
 * clearer as `map` or `filter` - grouping is one of the cases where it genuinely
 * fits.
 *
 * @param {Task[]} tasks
 * @returns {Record<string, Task[]>}
 */
export function groupByPriority(tasks) {
  return tasks.reduce((groups, task) => {
    // `??=` assigns only when the left side is null/undefined.
    groups[task.priority] ??= [];
    groups[task.priority].push(task);
    return groups;
  }, {});
}

/**
 * Summary counts. Derived data: compute it, never store it.
 *
 * @param {Task[]} tasks
 * @returns {{ total: number, done: number, open: number, percentDone: number }}
 */
export function summarise(tasks) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return {
    total,
    done,
    open: total - done,
    // Guard the divide-by-zero. `0/0` is NaN, and NaN renders as "NaN%".
    percentDone: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/**
 * Shallow-freeze an object so accidental mutation throws in strict mode
 * (ES modules are always strict). Useful in tests to *prove* a function is
 * pure.
 *
 * @template T
 * @param {T} value
 * @returns {Readonly<T>}
 */
export function freeze(value) {
  return Object.freeze(value);
}

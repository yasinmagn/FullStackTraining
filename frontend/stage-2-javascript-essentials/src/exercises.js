/**
 * Stage 2 exercises.
 *
 * Every function below throws. Your job is to implement them.
 *
 * 1. Open `exercises.test.js` and change `describe.skip` to `describe`.
 * 2. Run `npm run test:watch --workspace frontend-stage-2-javascript-essentials`
 * 3. Make the tests pass, one at a time.
 *
 * Solutions: `SOLUTIONS.md` in this folder. Try each one for at least ten
 * minutes before you look.
 */

const todo = (name) => {
  throw new Error(`Not implemented: ${name}. See src/exercises.js`);
};

/**
 * EXERCISE 1 - `pick`
 *
 * Return a new object containing only the listed keys. Keys that are absent on
 * the source are simply skipped (do not create `undefined` entries).
 *
 *   pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])  ->  { a: 1, c: 3 }
 *   pick({ a: 1 }, ['a', 'zzz'])            ->  { a: 1 }
 *
 * Hint: `Object.fromEntries` plus `filter` and `map`, or a small `for...of`.
 *
 * @template {object} T
 * @param {T} source
 * @param {string[]} keys
 * @returns {Partial<T>}
 */
export function pick(source, keys) {
  return todo('pick');
}

/**
 * EXERCISE 2 - `groupBy`
 *
 * The generic version of `groupByPriority` from collections.js. The second
 * argument is a function that returns the key for an item.
 *
 *   groupBy([1, 2, 3, 4], n => n % 2 ? 'odd' : 'even')
 *     ->  { odd: [1, 3], even: [2, 4] }
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} keyFn
 * @returns {Record<string, T[]>}
 */
export function groupBy(items, keyFn) {
  return todo('groupBy');
}

/**
 * EXERCISE 3 - `debounce`
 *
 * Return a wrapped function that only runs after `waitMs` have passed with no
 * further calls. This is what stops a search box from firing a request on every
 * keystroke.
 *
 *   const search = debounce(runSearch, 300);
 *   search('a'); search('ab'); search('abc');   // runSearch called once, with 'abc'
 *
 * Hints:
 *   - keep the timer id in a closure
 *   - `clearTimeout` the previous timer on every call
 *   - forward the LAST arguments, not the first
 *
 * @template {(...args: any[]) => void} F
 * @param {F} fn
 * @param {number} waitMs
 * @returns {(...args: Parameters<F>) => void}
 */
export function debounce(fn, waitMs) {
  return todo('debounce');
}

/**
 * EXERCISE 4 - `memoise`
 *
 * Cache results by argument. Use a `Map` keyed on `JSON.stringify(args)`.
 * Calling with the same arguments twice must call the underlying function once.
 *
 * Think about why `JSON.stringify` is a *bad* cache key in production code
 * (key order, functions, `undefined`, cycles, size). It is fine here.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @returns {F}
 */
export function memoise(fn) {
  return todo('memoise');
}

/**
 * EXERCISE 5 - `parseQuery`
 *
 * Turn a query string into an object. Repeated keys become an array.
 *
 *   parseQuery('?page=2&tag=a&tag=b')  ->  { page: '2', tag: ['a', 'b'] }
 *   parseQuery('')                     ->  {}
 *
 * Hint: `new URLSearchParams(input)` handles the decoding for you. Iterate it
 * rather than splitting on '&' by hand - encoded values will bite you.
 *
 * @param {string} input
 * @returns {Record<string, string | string[]>}
 */
export function parseQuery(input) {
  return todo('parseQuery');
}

/**
 * EXERCISE 6 - `timeout`
 *
 * Reject with `new Error('timeout')` if `promise` has not settled within
 * `ms`. Resolve/reject with the original outcome otherwise.
 *
 * Hint: `Promise.race`. Make sure you `clearTimeout` on the happy path, or the
 * process will stay alive waiting for a timer nobody needs.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 */
export function timeout(promise, ms) {
  return todo('timeout');
}

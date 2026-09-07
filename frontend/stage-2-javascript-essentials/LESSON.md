# Frontend Stage 2 — JavaScript Essentials

> **Goal:** the subset of modern JavaScript that actually shows up in production
> frontend code — immutability, async control flow, and error handling that
> doesn't leave a spinner on screen forever.

| | |
|---|---|
| **Time** | ~2 hours |
| **Prerequisites** | [Stage 1](../stage-1-web-foundations/LESSON.md) |
| **You will build** | A tested utility library, and six exercises you implement yourself |

---

## 1. Run it

```bash
npm install                                                  # once, from the repo root
npm test --workspace frontend-stage-2-javascript-essentials
```

All the reference tests should pass. The exercise tests are skipped until you
un-skip them.

---

## 2. Immutability, and why frameworks care

Read `src/collections.js`.

```js
// Mutating
tasks.push(newTask);          // returns a number; `tasks` is the same array

// Immutable
const next = [...tasks, newTask];   // a brand new array
```

This is not a style preference. React, Redux, TanStack Query, Vue, Svelte and
Zustand all detect change the same way:

```js
if (previousValue !== nextValue) rerender();
```

That is a **reference** comparison. `push` mutates the array in place, so the
reference is unchanged, so `previous !== next` is `false`, so nothing re-renders.
This is the single most common "my state changed but the UI didn't update" bug,
and you will hit it in Stage 5.

### The four moves

| Operation | Mutating | Immutable |
|---|---|---|
| Add | `arr.push(x)` | `[...arr, x]` |
| Remove | `arr.splice(i, 1)` | `arr.filter(a => a.id !== id)` |
| Update | `arr[i].done = true` | `arr.map(a => a.id === id ? {...a, done: true} : a)` |
| Sort | `arr.sort(fn)` | `arr.toSorted(fn)` or `[...arr].sort(fn)` |

ES2023 added the copying variants: `toSorted`, `toReversed`, `toSpliced`,
`with`. Use them.

### Structural sharing

Look closely at `updateTask`:

```js
tasks.map((task) => (task.id === id ? { ...task, ...changes } : task));
```

Unchanged tasks are returned **by reference** — the same object. Only the
changed one is new. This is what lets React skip re-rendering the other 99 rows,
and it is why the test asserts `expect(next[1]).toBe(tasks[1])`.

### Proving purity in a test

```js
const frozen = Object.freeze(tasks);
```

ES modules run in strict mode, so mutating a frozen object **throws**. Freezing
your test fixture turns "I hope this function is pure" into "the test fails if
it isn't".

---

## 3. Asynchrony

Read `src/async.js`.

### 3.1 `fetch` does not reject on 4xx/5xx

This surprises everyone once:

```js
const response = await fetch('/api/tasks/999');   // 404
// No throw. Execution continues happily.
console.log(response.ok);     // false
console.log(response.status); // 404
```

`fetch` only rejects on *network* failure — DNS, offline, CORS, an aborted
request. A 500 is a perfectly successful HTTP transaction as far as `fetch` is
concerned. If your `catch` block never runs, this is why.

`fetchJson` fixes three gaps in the raw API:

1. **Status handling** — throws a typed `HttpError` on non-2xx.
2. **Timeouts** — `fetch` has none. `AbortSignal.timeout(ms)` adds one, and
   unlike `Promise.race` it genuinely cancels the request.
3. **Body parsing** — an nginx 502 returns HTML. Calling `response.json()` on it
   throws a `SyntaxError` that tells you nothing about the real problem, so we
   read `.text()` and parse defensively.

### 3.2 Typed errors beat string matching

```js
export class HttpError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}
```

Now a caller can branch on `error.status === 401` instead of grepping
`error.message` for the word "unauthorized". Your error types are part of your
API design.

### 3.3 Retry only what might succeed

```js
isRetryable = (error) => error.status === 0 || error.status === 429 || error.status >= 500
```

Retrying a `400 Bad Request` is pointless — the request is malformed and will
stay malformed. Retry network blips, rate limits and server errors.

Delays double each attempt (100ms, 200ms, 400ms). **Exponential backoff** stops
a struggling server from being hammered by every client at once.

### 3.4 Concurrency has a limit

```js
await Promise.all(items.map(fetchOne));      // 500 items -> 500 simultaneous requests
await mapWithConcurrency(items, 5, fetchOne); // at most 5 in flight
```

Browsers cap connections per host (~6), and your API almost certainly rate
limits. `mapWithConcurrency` starts N workers that each pull the next index
until the queue is empty — note that it still returns results **in input
order**, which is what the test checks.

### 3.5 `Promise.all` vs `Promise.allSettled`

| | Behaviour | Use when |
|---|---|---|
| `Promise.all` | Rejects on the first failure, discarding the successes | All of them are required |
| `Promise.allSettled` | Always resolves, reporting each outcome | One broken widget shouldn't blank the dashboard |

---

## 4. Syntax worth having at your fingertips

```js
// Destructuring with defaults and renaming
const { timeoutMs = 8000, fetchImpl: doFetch = fetch, ...init } = options;

// Optional chaining - no throw if `cause` is null
if (cause?.name === 'TimeoutError') { }

// Nullish coalescing - only falls back on null/undefined, NOT on 0 or ''
const port = config.port ?? 3000;      // 0 stays 0
const wrong = config.port || 3000;     // 0 becomes 3000  <- classic bug

// Logical assignment
groups[key] ??= [];

// Exponentiation
baseDelayMs * 2 ** attempt;
```

The `??` vs `||` distinction bites people constantly. `||` falls back on every
falsy value — `0`, `''`, `false`, `NaN`. `??` falls back only on `null` and
`undefined`. For anything numeric or string-valued, you almost always want `??`.

---

## 5. Exercises

Open `src/exercises.js`. Six functions, all throwing.

1. In `src/exercises.test.js`, change `describe.skip` to `describe`.
2. Run the watcher:
   ```bash
   npm run test:watch --workspace frontend-stage-2-javascript-essentials
   ```
3. Make them pass one at a time.

| # | Function | Teaches |
|---|---|---|
| 1 | `pick` | `Object.fromEntries`, `Object.hasOwn` |
| 2 | `groupBy` | `reduce`, logical assignment |
| 3 | `debounce` | Closures, timers — the search-box workhorse |
| 4 | `memoise` | `Map` caching, and why `JSON.stringify` keys are a trap |
| 5 | `parseQuery` | `URLSearchParams`, repeated keys |
| 6 | `timeout` | `Promise.race`, cleaning up timers |

Solutions with commentary: [`SOLUTIONS.md`](./SOLUTIONS.md). Give each one ten
minutes first.

---

## 6. Checklist

- [ ] Why mutating an array can stop a React component re-rendering
- [ ] What structural sharing is and why it matters for performance
- [ ] Why `fetch` doesn't throw on a 500
- [ ] Which HTTP statuses are worth retrying, and why backoff doubles
- [ ] The difference between `Promise.all` and `Promise.allSettled`
- [ ] Why `??` is usually right and `||` is usually a bug

---

## 7. Further reading

- [MDN — Using promises](https://developer.mozilla.org/docs/Web/JavaScript/Guide/Using_promises)
- [MDN — `fetch`](https://developer.mozilla.org/docs/Web/API/Window/fetch)
- [MDN — `AbortSignal.timeout`](https://developer.mozilla.org/docs/Web/API/AbortSignal/timeout_static)

**Next:** [Stage 3 — TypeScript](../stage-3-typescript/LESSON.md)

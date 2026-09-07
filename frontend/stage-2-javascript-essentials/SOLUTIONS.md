# Stage 2 — Solutions

Try each exercise for at least ten minutes first. Reading a solution teaches you
much less than getting a test to go green.

---

## Exercise 1 — `pick`

```js
export function pick(source, keys) {
  return Object.fromEntries(
    keys.filter((key) => Object.hasOwn(source, key)).map((key) => [key, source[key]]),
  );
}
```

`Object.hasOwn(source, key)` is the modern replacement for
`Object.prototype.hasOwnProperty.call(source, key)`. Using `key in source`
would also match inherited properties from the prototype chain — usually not
what you want.

---

## Exercise 2 — `groupBy`

```js
export function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    (groups[key] ??= []).push(item);
    return groups;
  }, {});
}
```

`(groups[key] ??= []).push(item)` reads as: default the bucket to an empty array
if it is missing, then push into whatever is there.

> **Note:** modern runtimes ship `Object.groupBy(items, keyFn)` natively. Use it
> in real code; implementing it once is still worth doing.

---

## Exercise 3 — `debounce`

```js
export function debounce(fn, waitMs) {
  let timerId;
  return function debounced(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), waitMs);
  };
}
```

The three things that matter:

1. `timerId` lives in a **closure** — one per debounced function, shared across
   calls.
2. `clearTimeout` cancels the pending run, which is what makes it a *debounce*
   rather than a throttle.
3. `...args` is captured fresh on every call, so the last call's arguments win.

`function` rather than an arrow, plus `fn.apply(this, args)`, keeps `this`
working when the debounced function is used as a method.

**Debounce vs throttle:** debounce waits for quiet (search-as-you-type);
throttle runs at most once per interval (scroll handlers).

---

## Exercise 4 — `memoise`

```js
export function memoise(fn) {
  const cache = new Map();
  return function memoised(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
```

`cache.has(key)` rather than `if (cache.get(key))` — otherwise a cached
`undefined`, `0`, `null` or `''` would be recomputed every time.

**Why `JSON.stringify` is a bad production cache key:** `{a:1,b:2}` and
`{b:2,a:1}` stringify differently, functions and `undefined` vanish, `Map`/`Set`
become `{}`, cyclic objects throw, and the cache grows without bound. Real
memoisation uses a `WeakMap` keyed on object identity, or an explicit key
function, plus an eviction policy.

---

## Exercise 5 — `parseQuery`

```js
export function parseQuery(input) {
  const params = new URLSearchParams(input);
  const result = {};

  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    result[key] = values.length > 1 ? values : values[0];
  }

  return result;
}
```

`new Set(params.keys())` deduplicates, because `keys()` yields a repeated key
once per occurrence. `URLSearchParams` also handles `?` stripping and percent
decoding, which is exactly the part you would get wrong by hand.

---

## Exercise 6 — `timeout`

```js
export function timeout(promise, ms) {
  let timerId;

  const clock = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error('timeout')), ms);
  });

  return Promise.race([promise, clock]).finally(() => clearTimeout(timerId));
}
```

`Promise.race` settles with whichever promise settles first. The `.finally`
clears the timer on **both** paths — without it, a fast-resolving promise still
leaves a pending timer that keeps the Node process alive.

> In browser code, prefer `AbortSignal.timeout(ms)` with `fetch`. It genuinely
> cancels the request; `Promise.race` only stops you from *waiting* for it. See
> `fetchJson` in `src/async.js`.

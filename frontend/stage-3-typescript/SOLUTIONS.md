# Stage 3 — Solutions

---

## Exercise 1 — `sortBy`

```ts
/** Keys of T whose value is comparable with `<`. */
type ComparableKeys<T> = {
  [K in keyof T]: T[K] extends string | number ? K : never;
}[keyof T];

export function sortBy<T, K extends ComparableKeys<T>>(
  items: readonly T[],
  key: K,
  direction: 'asc' | 'desc' = 'asc',
): T[] {
  const sign = direction === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (typeof left === 'string' && typeof right === 'string') {
      return sign * left.localeCompare(right);
    }
    return sign * (Number(left) - Number(right));
  });
}
```

**How the type works.** The mapped type turns every key into either itself or
`never`, then `[keyof T]` indexes into it to get the *union of the values* —
and `never` disappears from a union. So `{ name: string; tags: string[] }`
yields `'name'`, and `sortBy(x, 'tags')` is a compile error.

`localeCompare` rather than `<` for strings: `'ä' < 'b'` is `false` with raw
comparison, which is not what a user expects from an A–Z sort.

---

## Exercise 2 — `partition`

```ts
export function partition<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): [T[], T[]] {
  const matching: T[] = [];
  const rest: T[] = [];

  for (const item of items) {
    (predicate(item) ? matching : rest).push(item);
  }

  return [matching, rest];
}
```

The annotation `[T[], T[]]` is what makes it a **tuple**. Without it,
`return [matching, rest]` infers `T[][]` and destructuring loses the guarantee
that there are exactly two elements.

One pass, not two `filter` calls — and the predicate runs once per item, which
matters if it is expensive.

**Bonus — narrowing version.** With a type predicate you can partition into two
*different* types:

```ts
export function partitionBy<T, U extends T>(
  items: readonly T[],
  predicate: (item: T) => item is U,
): [U[], Exclude<T, U>[]];
```

---

## Exercise 3 — `mapResult`

```ts
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? { ok: true, value: fn(result.value) } : result;
}
```

Two things worth noticing:

1. The failure branch returns `result` **unchanged** — same object, no
   allocation, and the mapper is never called.
2. This is `Array.prototype.map` for a container that holds zero-or-one value.
   Adding `flatMapResult` (where `fn` itself returns a `Result`) gives you
   chaining without a pyramid of `if (!x.ok) return x`.

---

## Exercise 4 — `deepFreeze`

```ts
type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

export function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze((value as Record<PropertyKey, unknown>)[key]);
    }
  }
  return value as DeepReadonly<T>;
}
```

- **`Object.isFrozen` guard** — without it, a cyclic object recurses forever.
- **`Reflect.ownKeys`** rather than `Object.keys` — it includes symbols and
  non-enumerable properties.
- **Recursive conditional type** — `T extends (infer U)[]` pulls the element
  type out of an array so the recursion can continue into it.

Freezing mutates in place, so the `as` cast is unavoidable here. That is fine:
the cast is doing what the runtime actually did.

---

## Exercise 5 — `groupTasksByStatus`

```ts
import { STATUSES } from './validation.js';

export function groupTasksByStatus(tasks: readonly Task[]): Record<Task['status'], Task[]> {
  // Seed every key first - that is what makes the type non-Partial.
  const groups = Object.fromEntries(STATUSES.map((s) => [s, [] as Task[]])) as Record<
    Task['status'],
    Task[]
  >;

  for (const task of tasks) {
    groups[task.status].push(task);
  }

  return groups;
}
```

The whole exercise is the **seeding step**. `reduce`-based grouping produces
`Partial<Record<K, V>>`, forcing every caller to write `groups.done?.length ?? 0`.
Seeding all the keys up front means `groups.done.length` just works.

`Task['status']` is an *indexed access type* — it reads the status type off
`Task` rather than restating the union, so the two can never drift.

---

## Exercise 6 — `comparePriority`

```ts
const PRIORITY_RANK = {
  high: 0,
  medium: 1,
  low: 2,
} as const satisfies Record<Priority, number>;

export function comparePriority(a: { priority: Priority }, b: { priority: Priority }): number {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}
```

`as const satisfies Record<Priority, number>` is the change detector: add
`'urgent'` to the `Priority` union and this object stops compiling until you
give it a rank. With a plain `Record<string, number>` you would ship a silent
`undefined - 1 === NaN`, and `NaN` comparators produce a scrambled sort with no
error at all.

A comparator returns a **number**, not a boolean: negative for "a first",
positive for "b first", zero for "equal".

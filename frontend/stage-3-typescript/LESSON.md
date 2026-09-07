# Frontend Stage 3 — TypeScript

> **Goal:** stop thinking of TypeScript as "JavaScript with annotations" and
> start using it as a design tool — one where illegal states cannot be
> represented.

| | |
|---|---|
| **Time** | ~2 hours |
| **Prerequisites** | [Stage 2](../stage-2-javascript-essentials/LESSON.md) |
| **You will build** | A typed domain model, a hand-rolled parser, and six type-level exercises |

---

## 1. Run it

```bash
npm test      --workspace frontend-stage-3-typescript
npm run typecheck --workspace frontend-stage-3-typescript
```

Both must stay green. In this stage the typecheck matters as much as the tests.

---

## 2. Model with unions, not strings

```ts
// Lets someone write 'hgih'. The bug ships.
priority: string;

// Doesn't.
type Priority = 'low' | 'medium' | 'high';
```

Every string field in your domain is a question: *is this genuinely free text,
or is it one of a known set?* If it is a known set, make it a union. The
compiler then tells you every switch statement you forgot to update when the set
grows.

---

## 3. Branded types kill argument-order bugs

```ts
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

type TaskId = Brand<string, 'TaskId'>;
type UserId = Brand<string, 'UserId'>;
```

At runtime these are plain strings — zero cost. At compile time:

```ts
function moveTask(taskId: TaskId, userId: UserId) { /* ... */ }

moveTask(userId, taskId);   // compile error. With plain `string`, silent bug.
```

The only way to make a `TaskId` is `taskId(value)`, so validation lives in
exactly one place.

---

## 4. Discriminated unions — the highest-value pattern in TypeScript

Here is how loading state is usually modelled, and it is wrong:

```ts
interface State<T> {
  isLoading: boolean;
  isError: boolean;
  data?: T;
  error?: Error;
}
```

Four booleans give **sixteen** combinations, and twelve are nonsense. What does
`{ isLoading: true, isError: true, data: x }` mean? Nobody knows, so every
component invents its own answer.

```ts
type RemoteData<T, E = Error> =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'success'; data: T }
  | { state: 'failure'; error: E };
```

Four states, exactly four. `data` exists only where it makes sense. Switching on
`state` **narrows** the type:

```ts
switch (result.state) {
  case 'success': return result.data;    // `data` exists here
  case 'failure': return result.error;   // `error` exists here
  //              result.data            // <- compile error, correctly
}
```

### Exhaustiveness with `never`

```ts
default:
  return assertNever(result);
```

`never` is the type with no values. Add a fifth variant to `RemoteData` and this
line stops compiling — the compiler walks you to every switch that needs
updating. This is refactoring with a safety net, and it is the reason to use
TypeScript at all.

---

## 5. Derive types; never copy them

```ts
type CreateTaskInput = Pick<Task, 'title' | 'priority'> &
  Partial<Pick<Task, 'description' | 'dueDate' | 'assigneeId'>>;

type UpdateTaskInput = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>;
```

| Utility | Does |
|---|---|
| `Partial<T>` | Every property optional |
| `Required<T>` | Every property required |
| `Readonly<T>` | Every property `readonly` |
| `Pick<T, K>` | Keep only these keys |
| `Omit<T, K>` | Drop these keys |
| `Record<K, V>` | An object with keys `K` and values `V` |
| `ReturnType<F>` | What a function returns |
| `Awaited<P>` | What a promise resolves to |

Every hand-written duplicate of a type is a place where two definitions can
drift apart. Derive instead.

You can also strip modifiers with a mapped type:

```ts
type TaskDraft = { -readonly [K in keyof CreateTaskInput]: CreateTaskInput[K] };
```

---

## 6. `satisfies`

```ts
const PRIORITY_LABELS = {
  low: 'Low', medium: 'Medium', high: 'High',
} as const satisfies Record<Priority, string>;
```

Compare the three ways of writing this:

| Written as | Missing key caught? | Value type |
|---|---|---|
| `const X = { ... }` | No | `'Low' \| ...` (precise) |
| `const X: Record<Priority, string> = { ... }` | Yes | `string` (widened — you lost it) |
| `const X = { ... } as const satisfies Record<Priority, string>` | **Yes** | **`'Low' \| ...` (precise)** |

`satisfies` gives you validation *and* precision. Use it for config objects,
lookup tables and route maps.

---

## 7. Parse, don't validate

Read `src/validation.ts`.

Everything crossing your program's boundary is untrusted: HTTP responses,
`localStorage`, URL params, form data, `JSON.parse`. TypeScript **erases at
runtime** — it cannot check any of it for you.

```ts
// A LIE. Nothing verifies this at runtime.
const task = await response.json() as Task;

// The truth, and the compiler now forces you to deal with it.
const parsed = parseCreateTaskInput(await response.json());
if (!parsed.ok) return showErrors(parsed.error);
// parsed.value is a real CreateTaskInput from here on
```

- A **validator** answers yes/no and hands back the same `unknown`. You can
  forget to check.
- A **parser** hands back a narrower *type*. You cannot forget, because the
  value is unreachable until you have.

### `unknown`, not `any`

`any` switches off type checking for everything downstream — one `any` in a
codebase quietly infects dozens of call sites. `unknown` is the honest type for
untrusted input: you can hold it, but you cannot *use* it until you narrow it.

Note that `parseJson` returns `Result<unknown>` rather than `any`, precisely so
the caller has to keep parsing.

### Results instead of exceptions

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

Another discriminated union. Exceptions are invisible in a function's signature;
a `Result` is right there in the return type, and the compiler makes you handle
the failure branch. Note that `parseCreateTaskInput` collects **all** the errors
— a form that reports one problem per submit is a bad form.

> **In real projects, use [zod](https://zod.dev).** It gives you a schema, an
> inferred type, and better error messages for a fraction of the code.
> Backend Stage 3 uses it. We hand-rolled this one so the mechanics are visible.

---

## 8. Type predicates

```ts
function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

const ids: string[] = maybeIds.filter(isPresent);   // not (string|null)[]
```

`value is T` tells the compiler what the boolean *means*, so narrowing flows
through `filter`, `if` and `&&`.

> **Careful:** a type predicate is a promise the compiler cannot verify. Write
> `value is T` and return the wrong boolean and you have lied to the type
> system. Keep predicates tiny and obviously correct.

---

## 9. Strictness settings that pay for themselves

`tsconfig.base.json` turns these on:

| Flag | Catches |
|---|---|
| `strict` | The whole family, including `strictNullChecks` — the single biggest win |
| `noUncheckedIndexedAccess` | `arr[0]` is `T \| undefined`, because an array index really can miss |
| `noImplicitOverride` | A method that silently stopped overriding after a rename |
| `noFallthroughCasesInSwitch` | A missing `break` |

`noUncheckedIndexedAccess` is the one people disable in frustration. Leave it on
— it finds real bugs. In this repo it is why `lines[line - 1] ?? ''` has a
fallback in `scripts/check-secrets.mjs`.

---

## 10. Exercises

Open `src/exercises.ts`. Un-skip `src/exercises.test.ts` and keep **both**
`npm test` and `npm run typecheck` green.

| # | Function | Teaches |
|---|---|---|
| 1 | `sortBy` | Constraining a generic key with a mapped/conditional type |
| 2 | `partition` | Tuple return types |
| 3 | `mapResult` | Making `Result` composable |
| 4 | `deepFreeze` | A recursive `DeepReadonly<T>` |
| 5 | `groupTasksByStatus` | `Record<K, V>` with every key guaranteed |
| 6 | `comparePriority` | `as const satisfies` as a change detector |

Solutions: [`SOLUTIONS.md`](./SOLUTIONS.md).

---

## 11. Checklist

- [ ] Why a discriminated union beats a bag of booleans
- [ ] How `assertNever` turns a new variant into a compile error
- [ ] The difference between `as`, `satisfies` and a plain annotation
- [ ] Why `as Task` on an API response is a lie
- [ ] Why `unknown` is safe and `any` is contagious
- [ ] What a branded type buys you

---

## 12. Further reading

- [TypeScript Handbook — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Total TypeScript — `satisfies`](https://www.totaltypescript.com/clarifying-the-satisfies-operator)
- ["Parse, don't validate"](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) — Alexis King
- [zod documentation](https://zod.dev)

**Next:** [Stage 4 — React Components](../stage-4-react-components/LESSON.md)

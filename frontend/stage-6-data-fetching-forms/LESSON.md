# Frontend Stage 6 — Data Fetching & Forms

> **Goal:** stop treating server data as client state. Learn what a query cache
> does, and build a form that handles validation, in-flight state and server
> errors properly.

| | |
|---|---|
| **Time** | ~3 hours |
| **Prerequisites** | [Stage 5](../stage-5-state-management/LESSON.md) |
| **You will build** | A task browser on TanStack Query with optimistic updates, a zod-validated form, and a side-by-side demo of the race condition hand-rolled fetching creates |

---

## 1. Run it

```bash
npm run dev  --workspace frontend-stage-6-data-fetching-forms   # http://localhost:5106
npm test     --workspace frontend-stage-6-data-fetching-forms
```

There is no backend to start: `src/api/fakeServer.ts` is an in-memory API with
adjustable latency and failure rates. The **Chaos controls** panel at the top of
the page is how you exercise every unhappy path.

---

## 2. Server data is not state — it is a cache

This is the idea the whole stage rests on.

```tsx
const [tasks, setTasks] = useState([]);   // ← a lie
```

`tasks` is not your state. It is a **stale copy of someone else's data**. The
server owns it, other users are changing it, and your copy was already out of
date the moment it arrived.

Cached data has needs that client state does not:

| Concern | Client state | Server cache |
|---|---|---|
| Who owns it | You | The server |
| Can go stale | No | **Always** |
| Needs refetching | No | Yes |
| Needs retries | No | Yes |
| Shared between components | Via context | Via cache key |
| Loading / error states | No | **Always** |

Trying to model that with `useState` + `useEffect` means reimplementing a cache,
badly. That is why TanStack Query exists — and why "should I use Redux for my
API data?" is the wrong question.

---

## 3. Why hand-rolled fetching goes wrong

Open **"Fetching by hand: the race condition"** in the running app, untick
*Cancel stale requests*, and type `optimistic` quickly.

```tsx
useEffect(() => {
  setIsLoading(true);
  fakeApi.listTasks({ query }).then((result) => {
    setTasks(result.data);   // whatever lands LAST wins
    setIsLoading(false);
  });
}, [query]);
```

Type "abc" and three requests go out. HTTP makes no promise about the order they
come back. If the response for `"a"` arrives last, it overwrites the results for
`"abc"` — the list now shows data for a query the user already replaced, with no
error and no warning.

### The fix

```tsx
useEffect(() => {
  let ignore = false;

  fakeApi.listTasks({ query }).then((result) => {
    if (ignore) return;              // superseded
    setTasks(result.data);
  });

  return () => { ignore = true; };   // runs before the next effect
}, [query]);
```

React runs the previous cleanup before the next effect, so the stale response
finds `ignore === true` and does nothing. (In real code use an
`AbortController` so the request is genuinely cancelled, not merely ignored.)

### And that is only the first problem

Even with the fix, `FixedList` still has **no** caching, **no** deduplication
between components, **no** retries, **no** background refetching, **no** "keep
the previous page visible", and refetches everything on every remount. That list
is the argument for a library.

---

## 4. TanStack Query: queries

```tsx
const tasks = useQuery(taskListQuery(params));
```

### Query keys

A key identifies a cache entry. Two rules and you will never fight the cache:

1. **Everything the fetcher reads must be in the key.** Miss a filter and you
   serve one filter's data under another's key.
2. **Structure keys hierarchically**, so you can invalidate a subtree:

```ts
['tasks']                              // everything task-related
['tasks', 'list']                      // every list, any filter
['tasks', 'list', { status: 'todo' }]  // one specific list
```

`src/api/queries.ts` puts them in a factory object. Inline string literals are
a source of silent cache misses — the most irritating bug this library has.

### `staleTime` is the dial that matters

| | Meaning |
|---|---|
| **Fresh** | Served from cache, no request at all |
| **Stale** | Served from cache instantly, *then* refetched in the background |

The default `staleTime` is `0` — everything is stale immediately, so every mount
refetches. Safe, but chatty. Choose from how fast the data really changes:
seconds for a live feed, minutes for a task list, hours for a country dropdown.

> `gcTime` (formerly `cacheTime`) is different: how long an *unused* entry stays
> in memory before being garbage collected. Default 5 minutes.

### The four states

```tsx
if (tasks.isPending) ...                                  // first load
if (tasks.isError) ...                                    // failed
if (tasks.isSuccess && tasks.data.data.length === 0) ...  // loaded, empty
if (tasks.isSuccess) ...                                  // loaded, has data
```

The one people forget is the third. "Loaded but empty" is not "still loading",
and conflating them gives you a spinner that never resolves.

Also distinguish:

- **`isPending`** — no data at all yet (show a skeleton)
- **`isFetching`** — a request is in flight, including background refetches
  (show a subtle indicator, never a skeleton over data you already have)

### Retries

```ts
retry: (failureCount, error) => {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 2;
}
```

A 404 will still be a 404 on the fourth attempt. Retrying client errors just
delays the message the user needs.

### `placeholderData` beats a spinner

```ts
placeholderData: (previous) => previous
```

Keeps the previous page on screen while the next loads, with
`isPlaceholderData` telling you to dim it. Compare with the alternative: the
list vanishes, the page height collapses, and the scroll position jumps.

---

## 5. Mutations

```tsx
const createTask = useMutation({
  mutationFn: (input) => api.createTask(input),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
});
```

**Invalidation** is the default way to keep the cache honest after a write.
`['tasks', 'list']` is a *prefix* match, so every list — whatever filters happen
to be active — is marked stale and refetched if it is on screen.

Why not write the new task into the cache by hand? Because the server may have
changed it (defaults, trimming, computed fields), and because the list has a
sort order you would have to reimplement on the client.

### Optimistic updates

Toggling a checkbox should feel instant. Update the cache first, fire the
request, roll back on failure:

```ts
onMutate: async ({ id, status }) => {
  await queryClient.cancelQueries({ queryKey: listKey });   // ①
  const previous = queryClient.getQueryData(listKey);        // ②
  queryClient.setQueryData(listKey, applyTheGuess);          // ③
  return { previous };
},
onError: (_e, _v, context) => {
  queryClient.setQueryData(listKey, context.previous);       // ④
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: taskKeys.lists() });  // ⑤
},
```

Each step is load-bearing:

① **Cancel in-flight refetches.** Without this, a refetch that started *before*
your optimistic write can land *after* it and overwrite your guess with stale
data. This is the step everyone skips, and the resulting bug is maddening.

② **Snapshot** so you have something to roll back to.
③ **Apply the guess** — the UI updates immediately.
④ **Roll back** on failure.
⑤ **Invalidate regardless.** The server has the last word; the optimistic value
was only ever a guess.

**Try it:** set *Write failures* to 100% in the Chaos panel and tick a checkbox.
It flips instantly, then flips back with an error. That is the contract working.

> Use optimistic updates for actions that almost always succeed and are cheap to
> undo. Do not use them for payments.

---

## 6. Forms

`src/components/TaskForm.tsx` is a form built without a form library, so you can
see what one would be doing for you.

### Validate on submit, then live

```tsx
if (wasSubmitted) {
  const parsed = createTaskSchema.safeParse(next);
  setErrors(parsed.success ? {} : toFieldErrors(parsed.error));
}
```

Validating from the first keystroke shows *"Title needs at least 3 characters"*
while the user types the first character — technically true, actively hostile.
Validate on submit, then keep it live so they watch the error clear as they fix
it.

### The form schema is not the entity schema

```ts
export const taskSchema = z.object({ id, title, createdAt, ... });      // what the server sends
export const createTaskSchema = z.object({ title, description, ... });  // what a human types
```

Different rules for different jobs. Conflating them is how you end up
validating `createdAt` on a create form.

Note `.transform((value) => (value === '' ? null : value))` — an untouched
textarea gives `''`, and `''` means *absent*, not *invalid*.

### Server errors go in the same place as client errors

```tsx
onError: (error) => {
  if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
  else setErrors({ _root: error.message });
}
```

Client validation is a **convenience**. The server is the **authority** — it
knows about uniqueness, permissions and race conditions the browser cannot see.

**Try it:** add a task titled `Learn TanStack Query` (it already exists). The
client is happy; the server returns 409 and the message appears under the title
field.

### Accessible errors

```tsx
<input aria-invalid={!!error} aria-describedby="title-error" />
<p className="error" id="title-error" aria-live="polite">{error ?? ''}</p>
```

- `aria-describedby` is what makes a screen reader read the message when focus
  lands on the field.
- The paragraph is always rendered so `aria-live` has something to observe.
- `role="alert"` (assertive) for form-level failures; `aria-live="polite"` for
  field hints.

### Disable the submit button while in flight

```tsx
<button type="submit" disabled={createTask.isPending}>
```

The cheapest possible fix for double submits — and the reason you should never
create duplicate records because someone double-clicked.

---

## 7. One `QueryClient`, outside the component

```tsx
const queryClient = new QueryClient({ ... });   // module scope

export default function App() {
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>;
}
```

Create it *inside* `App` and you build a new client — and an empty cache — on
every render. Everything refetches constantly and you blame the library.

---

## 8. Exercises

### Exercise 1 — A detail query
Add `taskDetailQuery(id)` and a panel that loads one task. Prefetch it on hover
over the row, so the panel is instant.

### Exercise 2 — Optimistic delete
Deleting currently waits for the server. Make it optimistic, with rollback.
*Harder than the toggle: you must restore the row **at its original index**, not
append it.*

### Exercise 3 — Infinite scroll
Replace the pager with `useInfiniteQuery`.
*Note how `getNextPageParam` derives the cursor from `meta` — the server tells
the client when to stop, not the other way round.*

### Exercise 4 — Move validation to React Hook Form
Reimplement `TaskForm` with `react-hook-form` + `@hookform/resolvers/zod`.
Compare line counts, and note which parts you no longer write by hand.

### Exercise 5 — Cross-field validation
Make `dueDate` invalid if it is in the past *and* status is `todo`.
*Hint: `z.object({...}).refine(...)` for rules that span fields.*

### Exercise 6 — Point it at the real API
Once you have finished the backend track, swap `fakeServer.ts` for real `fetch`
calls against `http://localhost:3000`. **Nothing above the API layer should
need to change** — that is the payoff for keeping it behind one module.

---

## 9. Checklist

- [ ] Why server data is a cache and not state
- [ ] The race condition in `useEffect` fetching, and the two ways to fix it
- [ ] What must appear in a query key, and why keys are hierarchical
- [ ] `staleTime` vs `gcTime`; `isPending` vs `isFetching`
- [ ] All four query states, including "loaded but empty"
- [ ] Why `cancelQueries` is required in `onMutate`
- [ ] Why client validation never replaces server validation
- [ ] How `aria-describedby` and `aria-live` make form errors reach everyone

---

## 10. Further reading

- [TanStack Query — Important defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [TanStack Query — Optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [TkDodo — Practical React Query](https://tkdodo.eu/blog/practical-react-query) *(the best writing on this library)*
- [zod](https://zod.dev)
- [WAI — Form instructions and errors](https://www.w3.org/WAI/tutorials/forms/)

**Next:** [Stage 7 — Routing & Testing](../stage-7-routing-testing/LESSON.md)

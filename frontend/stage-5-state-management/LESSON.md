# Frontend Stage 5 — State Management

> **Goal:** learn to decide *what is state*, *where it lives*, and *which tool
> holds it* — the three decisions that determine whether a React codebase stays
> workable at 50 components.

| | |
|---|---|
| **Time** | ~3 hours |
| **Prerequisites** | [Stage 4](../stage-4-react-components/LESSON.md) |
| **You will build** | A task board driven by a tested reducer, delivered through split contexts, plus two custom hooks |

---

## 1. Run it

```bash
npm run dev  --workspace frontend-stage-5-state-management   # http://localhost:5105
npm test     --workspace frontend-stage-5-state-management   # 16 reducer tests, no DOM
```

Install [React DevTools](https://react.dev/learn/react-developer-tools) and turn
on **"Highlight updates when components render"**. You will use it in section 8.

---

## 2. Most "state" is not state

This is the highest-leverage idea in the whole stage. Before adding a
`useState`, ask:

> **Can I compute this from something I already have?**

If yes, it is not state. It is a **derived value**, and storing it creates a
second copy that will eventually disagree with the first.

```tsx
// ✗ Four pieces of state, three of which can go stale
const [tasks, setTasks] = useState([]);
const [filteredTasks, setFilteredTasks] = useState([]);
const [doneCount, setDoneCount] = useState(0);
const [hasCompleted, setHasCompleted] = useState(false);

// ✓ One piece of state. The rest are functions of it.
const [tasks, setTasks] = useState([]);
const filteredTasks = tasks.filter(matchesFilter);
const doneCount = tasks.filter((t) => t.status === 'done').length;
const hasCompleted = doneCount > 0;
```

Look at `src/tasks/types.ts`. `TasksState` holds five fields and *not one of
them is derived*. `selectVisibleTasks`, `selectStats` and `selectIsFiltered` in
`taskReducer.ts` compute everything else on demand.

### The test

| Question | Then |
|---|---|
| Can it be computed from other state or props? | Derive it |
| Does it come from the server? | It is *cache*, not state — Stage 6 |
| Does it survive a page reload? | URL or storage, not `useState` |
| Is it only ever read, never rendered? | `useRef` |
| Otherwise | It is genuinely state |

### The `useEffect` anti-pattern

```tsx
// ✗ Renders once with the wrong value, then again with the right one.
const [visible, setVisible] = useState([]);
useEffect(() => { setVisible(tasks.filter(matches)); }, [tasks, filter]);

// ✓
const visible = tasks.filter(matches);
```

The effect version is not just wasteful — it is *wrong for one frame*, and
that frame is where "the count says 3 but there are 4 rows" comes from.

> **Rule:** you do not need an effect to transform data for rendering. Effects
> are for **synchronising with something outside React** — the DOM, a
> subscription, a timer, `localStorage`, an analytics SDK.

---

## 3. `useState`: the three surprises

Open the **useState lab** in the running app (`src/components/CounterLab.tsx`).

### 3.1 Updates are not immediate

```tsx
setCount(count + 1);
console.log(count); // still the OLD value
```

`count` is a `const` captured when this render ran. `setCount` schedules a *new
render* with a new `count`. Nothing can change what the current one holds.

### 3.2 The updater form

```tsx
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);   // +1 total — all three read the same stale value

setCount((c) => c + 1);
setCount((c) => c + 1);
setCount((c) => c + 1);   // +3 — each receives the latest pending value
```

> **Rule:** if the next value depends on the previous one, pass a function.

### 3.3 Batching

Both buttons in the lab cause exactly **one** re-render. React batches every
update inside an event handler — and since React 18, inside promises,
`setTimeout` and native handlers too.

### 3.4 Lazy initial state

```tsx
useState(expensiveRead())        // runs on EVERY render, result thrown away
useState(() => expensiveRead())  // runs once
```

`useLocalStorage` uses the second form, because `localStorage.getItem` +
`JSON.parse` on every keystroke is a real cost.

The same applies to `useReducer`'s third argument — see `TasksProvider.tsx`:

```tsx
useReducer(taskReducer, undefined, createInitialState)
```

---

## 4. Where should state live?

| Who needs it | Where it goes | In this app |
|---|---|---|
| One component | `useState` in that component | `TaskForm`'s draft title |
| Two siblings | Lift to their nearest common parent | — |
| Much of the app | Reducer + context | `tasks`, `query`, `statusFilter` |
| The server owns it | A data-fetching cache | Stage 6 |
| Should survive reload / be shareable | URL params or storage | `showLab` |

Two mistakes, equally common:

- **Too low** — state that two siblings need, stuck in one of them, so you end
  up firing callbacks sideways through a parent.
- **Too high** — a form's half-typed draft in a global store, so every keystroke
  re-renders the entire page.

`TaskForm` shows the right call: `title` and `priority` are local, because
nothing else in the app needs half-finished input. Only the *finished* task
is dispatched.

---

## 5. Lifting state up

When two components need the same state, move it to their closest common
ancestor and pass it down.

In this app the filter controls (`TaskFilters`) and the list that obeys them
(`TaskList`) are siblings, so the state moved up to the shared owner — the
reducer. Note again what got lifted: the user's **choice** (`query`,
`statusFilter`, `sortKey`), never the **consequence** (the filtered array).

---

## 6. `useReducer`: when `useState` stops scaling

Reach for a reducer when:

- several pieces of state change together
- the next state depends on the previous in non-trivial ways
- the same transition is triggered from multiple components
- you want to unit-test the logic without rendering anything

```
(state, action) -> newState
```

`src/tasks/taskReducer.ts` holds the entire state machine — twelve actions, one
file you can read top to bottom. Three details worth copying:

**Actions describe intent, not mechanism.**

```tsx
dispatch({ type: 'task/toggled', id });          // ✓ what happened
dispatch({ type: 'setTasks', tasks: newArray }); // ✗ the caller now owns the rules
```

**Related updates stay atomic.** Removing a task also closes its inline editor:

```ts
case 'task/removed':
  return {
    ...state,
    tasks: state.tasks.filter((t) => t.id !== action.id),
    editingId: state.editingId === action.id ? null : state.editingId,
  };
```

With two `useState` calls this invariant lives in every call site, and one of
them will forget.

**No-ops return the same reference.**

```ts
if (title.length === 0) return state;
```

React bails out of re-rendering when the state reference is unchanged. Free
performance, and the invalid value never enters the store.

### Reducers must be pure

No `Math.random()`, no `Date.now()`… wait — `taskReducer` *does* call
`Date.now()` for `createdAt`, and that is a deliberate compromise for a teaching
app. In production, generate ids and timestamps in the **action creator** and
pass them in as part of the action, so the reducer stays a pure function of its
inputs. That is what makes replay, undo/redo and time-travel debugging possible.
(Note that `nextId()` is a resettable counter precisely so the tests are
deterministic.)

### The payoff: tests with no DOM

`taskReducer.test.ts` covers the whole state machine in ~250ms — no `render()`,
no `act()`, no jsdom. That is the strongest practical argument for reducers.

---

## 7. Context: prop drilling, not state management

Context solves exactly one problem:

```
App -> Layout -> Sidebar -> FilterPanel -> StatusFilter
```

…where only the last one wants the data. Context lets a descendant read a value
without every layer in between forwarding it.

**Context is not a state manager.** The state still lives in `useReducer`.
Context is the delivery mechanism.

### The two-context split

Every consumer of a context re-renders when that context's **value** changes by
reference. So this is a trap:

```tsx
// ✗ New object identity on every state change. Every consumer re-renders,
//   including buttons that only ever dispatch.
<TasksContext.Provider value={{ state, dispatch }}>
```

`TasksProvider.tsx` splits them:

```tsx
<TasksDispatchContext.Provider value={dispatch}>   {/* never changes */}
  <TasksStateContext.Provider value={state}>       {/* changes with state */}
```

React guarantees `dispatch` is referentially stable for the component's
lifetime, so `TasksDispatchContext`'s value never changes and its consumers
never re-render from context.

### Custom hooks with a null check

```tsx
export function useTasksState(): TasksState {
  const state = useContext(TasksStateContext);
  if (state === null) throw new Error('useTasksState must be used inside <TasksProvider>');
  return state;
}
```

Four extra lines buy you a non-nullable return type *and* an error that names
the real mistake, instead of `Cannot read property 'tasks' of null` surfacing
somewhere unrelated.

---

## 8. Custom hooks

A custom hook is just a function that calls other hooks. No special mechanism.
The rules:

1. The name starts with `use`.
2. Hooks are called unconditionally, at the top level, in the same order every
   render. (React tracks state **by call order**, which is why a hook inside an
   `if` breaks everything.)

Components extract **markup**. Hooks extract **stateful logic**.

Two hooks worth studying:

**`useLocalStorage`** (`src/hooks/useLocalStorage.ts`)
- lazy `useState` initialiser so storage is read once
- `try/catch` on *both* read and write — private browsing, quota, corrupt JSON.
  Losing persistence is acceptable; crashing on a keystroke is not
- a `storage` event listener to sync other tabs, **with cleanup**

**`useDebouncedValue`** (`src/hooks/useDebouncedValue.ts`)
- the cleanup *is* the mechanism. React runs the previous cleanup before each
  new effect, so the pending timer is cancelled and only the last one fires.
  Delete the `return` and you get every intermediate value, each delayed

> **Two components using the same hook get independent state.** Hooks share
> logic, never state. If you want shared state, that is context or a store.

### Effect cleanup is not optional

```tsx
useEffect(() => {
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);  // ← required
}, [key]);
```

Without it every remount adds another listener. StrictMode double-mounts in
development *specifically* so you notice.

---

## 9. Resetting state with `key`

`TaskRow.tsx` does this:

```tsx
<InlineEditor key={task.id} initialTitle={task.title} ... />
```

Changing a `key` destroys the component and mounts a fresh one — which **resets
its state**. Without it, clicking edit on task B while A's editor was open would
reuse the same instance and show A's half-typed draft.

The alternative people reach for first is wrong:

```tsx
// ✗ Renders stale, then corrects; clobbers what the user typed
useEffect(() => setDraft(initialTitle), [initialTitle]);
```

> **"Reset state with a key"** is one of the most useful React idioms, and one
> of the least known.

---

## 10. When do you need a real state library?

Honest answer: **later than you think, and for a narrower reason than you
think.**

Reducer + context handles a surprising amount. The specific thing it *cannot*
do is let a component subscribe to a **slice** of state and skip re-renders when
unrelated slices change — plain context re-renders every consumer, full stop.
(`useTasksSelector` in this repo memoises the *computation*, not the render; the
JSDoc says so plainly rather than pretending otherwise.)

| Reach for | When |
|---|---|
| `useState` | Local, simple |
| `useReducer` | Complex transitions, several fields moving together |
| `+ context` | Many components need it, prop drilling hurts |
| **Zustand / Jotai / Redux Toolkit** | Large shared state where selector-level subscriptions genuinely matter, or you want devtools/middleware |
| **TanStack Query** | The data lives on a **server** — see Stage 6 |

The most common architectural mistake in React apps is putting server data in a
client state manager. A cached copy of someone else's data has completely
different needs — staleness, refetching, retries, invalidation — and that is
Stage 6's subject.

### See the re-renders

Turn on **Highlight updates when components render** in React DevTools, then:

1. Type in the search box. Which components flash?
2. Merge the two contexts into one `{ state, dispatch }` object and type again.
   Notice what starts flashing.
3. Put it back.

---

## 11. Exercises

### Exercise 1 — Undo
Add `task/undone`. Keep a bounded history (last 10 states) in the reducer and
dispatch `history/undo` to pop it.
*Hint: `{ past: TasksState[], present: TasksState }` — and cap the array, or
you have a memory leak.*

### Exercise 2 — Debounce the search
The search box currently filters on every keystroke. Wire in
`useDebouncedValue` so the *input* stays instant but the *filtering* waits
300ms. Keep the typed value in local state; dispatch the debounced one.
*Why does the input have to stay controlled by local state? Try it the other
way and watch the cursor jump.*

### Exercise 3 — Persist the tasks
Persist `state.tasks` to `localStorage` and rehydrate on load.
*Where does this belong — an effect in the provider, or the reducer? Argue both
sides, then pick. (Persistence is a side effect; reducers are pure.)*

### Exercise 4 — Put filters in the URL
Move `query` and `statusFilter` into the query string so a filtered view can be
bookmarked and shared. `URLSearchParams` + `history.replaceState` is enough.
*This is the "does it survive a reload?" test from section 2 answering "URL".*

### Exercise 5 — Test the new actions
Every exercise above adds actions. Add cases to `taskReducer.test.ts`. Notice
you never have to render anything.

### Exercise 6 — Find a redundant `useState`
Search your own past projects for a `useState` that is derived from another.
Delete it. This is the exercise that pays off for years.

---

## 12. Checklist

- [ ] How to tell state from a derived value, and why storing derived data rots
- [ ] Why `setCount(count + 1)` three times gives +1 and the updater gives +3
- [ ] When to lift state up, and when lifting it is a mistake
- [ ] What a reducer buys you that several `useState` calls do not
- [ ] Why context is a delivery mechanism, not a state manager
- [ ] Why splitting state and dispatch contexts prevents needless re-renders
- [ ] Why effect cleanup is mandatory, and what StrictMode is telling you
- [ ] How `key` resets a component's state, and why that beats a sync effect
- [ ] Why server data does not belong in client state

---

## 13. Further reading

- [React — Managing state](https://react.dev/learn/managing-state)
- [React — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) *(read this one twice)*
- [React — Scaling up with reducer and context](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [Kent C. Dodds — Application state management](https://kentcdodds.com/blog/application-state-management-with-react)

**Next:** [Stage 6 — Data Fetching & Forms](../stage-6-data-fetching-forms/LESSON.md)

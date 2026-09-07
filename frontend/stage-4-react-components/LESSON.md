# Frontend Stage 4 — React Components

> **Goal:** understand what React actually gives you over the hand-written DOM
> code in Stage 1, and learn to decompose a UI so the pieces stay reusable.

| | |
|---|---|
| **Time** | ~2 hours |
| **Prerequisites** | [Stage 3](../stage-3-typescript/LESSON.md) |
| **You will build** | A task board split into five components, with slot-based composition |

---

## 1. Run it

```bash
npm run dev --workspace frontend-stage-4-react-components
```

Open <http://localhost:5104>. Edit any file and the browser updates without a
reload — that is Vite's hot module replacement.

---

## 2. What React actually does

Go back to Stage 1's `app.js` and look at `render()`:

```js
list.replaceChildren(...visible.map(renderTask));
```

You described the *result* you wanted and let the browser work out the DOM
operations — except you were doing the crudest possible version, throwing away
every node and rebuilding.

React is that idea, done properly:

> **You write a function from state to markup. React works out the minimum set
> of DOM operations to get there.**

```tsx
function TaskStats({ tasks }) {
  const done = tasks.filter((t) => t.status === 'done').length;
  return <p>{done} of {tasks.length} done</p>;
}
```

No `createElement`, no `textContent`, no manual sync. Change `tasks` and the
paragraph updates. Everything else in React exists to support that one idea.

### JSX is a function call

```tsx
<Badge tone="info">3 open</Badge>
```

compiles to roughly:

```js
jsx(Badge, { tone: 'info', children: '3 open' })
```

That is why `children` behaves like any other prop, why you can put an element
in a variable, and why `{}` inside JSX just means "a JavaScript expression goes
here".

---

## 3. Props: data down, callbacks up

```tsx
interface TaskItemProps {
  task: Task;                          // data down
  onToggle: (id: string) => void;      // events up
  onRemove: (id: string) => void;
}
```

Props are **read-only**. A component may never write to its props — that is the
`const` of React. When a child needs something to change, it calls a function
its parent gave it, and the parent changes its own state.

### Naming conventions worth following

| Prop kind | Convention | Example |
|---|---|---|
| Data | Noun | `task`, `tasks`, `isSelected` |
| Callback | `on` + event | `onToggle`, `onRemove`, `onSubmit` |
| Slot (JSX) | Noun for the region | `action`, `footer`, `emptyState` |

### The inline-arrow rule

```tsx
onChange={() => onToggle(task.id)}   // correct
onChange={onToggle(task.id)}         // calls it DURING RENDER
```

The second form invokes `onToggle` while rendering and passes its return value
(`undefined`) as the handler. Symptom: every handler in the list fires at once
on page load, often in an infinite loop. This trips up everyone once.

---

## 4. Container vs presentational

```
App                 owns state + handlers        (container)
 └─ TaskStats       receives data                 (presentational)
 └─ TaskList        receives data + callbacks     (presentational)
     └─ TaskItem    receives one task + callbacks (presentational)
         └─ Badge   receives children             (presentational)
```

A **presentational** component takes props and renders markup. It does not
fetch, does not own state, and does not know where its callbacks lead. That is
what makes `Badge` and `Card` reusable across the whole app, and what makes
`TaskItem` testable without a server.

Push state **up** to where it is needed, and keep the leaves dumb.

---

## 5. Composition over configuration

Look at `Card.tsx`. The design that seems obvious at first is a growing pile of
props:

```tsx
<Card title="Tasks" showFooter footerText="4 items" headerIcon="list"
      headerAction={...} collapsible variant="bordered" />
```

Every new requirement adds another prop, and the component becomes a
badly-specified framework nobody wants to touch.

The alternative is **slots** — props whose value is JSX:

```tsx
interface CardProps {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}
```

```tsx
<Card
  title="Tasks"
  action={<Badge tone="info">{openCount} open</Badge>}
  footer={<TaskStats tasks={tasks} />}
>
  <TaskList ... />
</Card>
```

`Card` has no idea what a task is, what a badge is, or what a stat is. It lays
out four regions. That is why it will still be useful in six months.

**Rule of thumb:** when you find yourself adding a boolean prop to control what
renders, you probably want a slot instead.

---

## 6. Conditional rendering, and the `0` trap

React renders `null`, `undefined`, `false` and `true` as **nothing**. So:

```tsx
{task.description && <p>{task.description}</p>}
```

But watch this one:

```tsx
{tasks.length && <TaskList tasks={tasks} />}
```

With an empty array, `tasks.length` is `0` — a number, not a boolean — and React
renders a **literal `0`** on the page. Fix it by producing a real boolean or a
ternary:

```tsx
{tasks.length > 0 && <TaskList tasks={tasks} />}
{tasks.length ? <TaskList tasks={tasks} /> : null}
```

This is the most-reported "why is there a 0 on my page" bug in React.

---

## 7. Keys — the one that causes real bugs

```tsx
{tasks.map((task) => (
  <TaskItem key={task.id} task={task} ... />
))}
```

`key` is React's **identity** for a list item across renders. It answers: is
this the same row as before, or a different one?

### Try the experiment

1. In `TaskList.tsx`, change `key={task.id}` to `key={index}` (you will need to
   add `index` to the `map` callback).
2. In the browser, tick the checkbox on the **second** task.
3. Delete the **first** task.

The tick jumps to the wrong row. Here is why:

| | Before delete | After delete, index keys | After delete, id keys |
|---|---|---|---|
| key 0 | Task A | Task B ← *React thinks A's content changed* | — (A removed) |
| key 1 | Task B *(ticked)* | Task C | Task B *(still ticked)* |

With index keys, React sees "the item at key 1 now has different content" and
**reuses the existing DOM node and component state** for a different task. With
id keys it sees "the item with key `a1` is gone" and removes precisely that row.

### The rules

- Use a **stable, unique id from your data**.
- Never use the array index when the list can reorder, filter or delete.
- Never use `Math.random()` — a new key every render means React destroys and
  recreates every row, losing focus and state and tanking performance.
- Keys must be unique **among siblings**, not globally.

Index keys are safe only for a list that is static, never reordered, and whose
items hold no state — which is rarer than you think.

---

## 8. Derived values are computed, not stored

`TaskStats.tsx` has no `useState`, and that is deliberate:

```tsx
const done = tasks.filter((task) => task.status === 'done').length;
```

If `done` lived in state you would need an effect to keep it in sync with
`tasks`, and that effect runs *after* render — so for one frame the UI shows the
old number. This is the source of "the count says 3 but there are 4 rows".

> **The rule:** if a value can be computed from props or state, compute it
> during render. Reach for `useMemo` only when profiling shows the computation
> is actually expensive — and `filter` over forty items is not.

Stage 5 makes this a formal principle.

---

## 9. StrictMode

`main.tsx` wraps the app in `<StrictMode>`. In development it deliberately
double-invokes your components and effects to surface impure render logic and
missing effect cleanup.

If something breaks only under StrictMode, **the component is the bug**, not
StrictMode. It does nothing in production builds.

---

## 10. Exercises

Work in `src/`. Keep `npm run typecheck` green throughout.

### Exercise 1 — `<EmptyState />`
Extract the empty case out of `TaskList` into its own component taking
`title`, `description` and an optional `action` slot. Use it from `App`.

### Exercise 2 — `<PriorityFilter />`
A presentational segmented control: props `value: Priority | 'all'` and
`onChange`. `App` owns the state; the filter only reports clicks. Give it
`aria-pressed`, as in Stage 1.

### Exercise 3 — Break keys on purpose
Do the experiment in section 7, watch it fail, then fix it. Write two sentences
in your own words explaining what went wrong.

### Exercise 4 — `<TaskGroup />`
Group tasks by status and render three `Card`s. Reuse `TaskList` inside each.
*This is composition paying off — you should write almost no new markup.*

### Exercise 5 — Sort control
Add a `<select>` for sort order (priority, due date, title). Note that the
sorted list is **derived** — do not store it in state.

### Exercise 6 — Find the accessibility gaps
Tab through the app with the keyboard only. Which controls can you not reach or
not identify? Fix them.

---

## 11. Checklist

- [ ] Why props are read-only, and how a child triggers a change anyway
- [ ] Why `onClick={handler(id)}` breaks and `onClick={() => handler(id)}` works
- [ ] When to add a slot instead of another boolean prop
- [ ] Exactly what goes wrong with index keys, and when they are safe
- [ ] Why `{count && <X/>}` can render a literal `0`
- [ ] Why derived values should not live in state

---

## 12. Further reading

- [React — Describing the UI](https://react.dev/learn/describing-the-ui)
- [React — Rendering lists](https://react.dev/learn/rendering-lists)
- [React — Passing props to a component](https://react.dev/learn/passing-props-to-a-component)

**Next:** [Stage 5 — State Management](../stage-5-state-management/LESSON.md)

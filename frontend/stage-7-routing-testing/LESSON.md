# Frontend Stage 7 — Routing & Testing

> **Goal:** turn a single screen into a real application with URLs, and learn to
> test it the way a user actually uses it.

| | |
|---|---|
| **Time** | ~2.5 hours |
| **Prerequisites** | [Stage 6](../stage-6-data-fetching-forms/LESSON.md) |
| **You will build** | A nested-layout router with deep links, lazy routes and a 404, plus **18 passing tests** covering routing, forms and accessibility |

---

## 1. Run it

```bash
npm run dev  --workspace frontend-stage-7-routing-testing   # http://localhost:5107
npm test     --workspace frontend-stage-7-routing-testing   # 18 tests
```

---

## PART ONE — ROUTING

## 2. Nested layouts and `<Outlet />`

```tsx
{
  path: '/',
  element: <RootLayout />,          // header + nav, rendered once
  children: [
    { index: true, element: <TasksPage /> },      // renders at "/"
    { path: 'tasks/:taskId', element: <TaskDetailPage /> },
    { path: 'about',  element: <AboutPage /> },
    { path: '*',      element: <NotFoundPage /> },
  ],
}
```

`<Outlet />` inside `RootLayout` is the hole the matched child renders into. The
header and nav are **not re-mounted** on navigation, which is why scroll
position, focus and any layout-level state survive. There is a test asserting
exactly that:

```tsx
expect(screen.getByRole('heading', { level: 1, name: 'Task Board' })).toBe(heading);
```

An **index route** is what renders at the parent's own path. A **catch-all**
(`path: '*'`) is what stops an unknown URL rendering nothing at all.

---

## 3. Links, not click handlers

```tsx
<Link to={`/tasks/${task.id}`}>{task.title}</Link>       // ✓ a real <a href>
<div onClick={() => navigate(`/tasks/${task.id}`)}>       // ✗
```

`<Link>` renders an anchor, so you get middle-click, ⌘-click, "open in new tab",
"copy link address", and it is announced as a link. The `<div>` version has none
of that, and no keyboard access either.

Use `useNavigate()` for navigation that follows an *action* — after a
successful form submit, or a redirect on logout. Not for things a user clicks
to go somewhere.

### `<NavLink>` knows if it is active

```tsx
<NavLink to="/" end>
  {({ isActive }) => <span aria-current={isActive ? 'page' : undefined}>Tasks</span>}
</NavLink>
```

`aria-current="page"` is the standard way to announce "you are here" — better
than a CSS class alone.

**`end` matters.** Without it, `/` is considered active on *every* page, because
every path starts with `/`.

---

## 4. The URL is state

This is the routing counterpart to Stage 5's "most state is not state".

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const status = searchParams.get('status') ?? 'all';
```

Filters, sort order, page number, the open tab — put them in the query string,
not `useState`, because the URL is the only state that:

- survives a refresh
- can be bookmarked
- can be **shared** ("look at this filtered view")
- works with the back button
- is where the user already expects it to be

`useSearchParams` has the same shape as `useState`, so the change is nearly
mechanical.

### `replace: true`

```tsx
setSearchParams({ status: option }, { replace: true });
```

Flipping between four filters should not push four history entries the user has
to click back through to leave the page. Replace for filter changes; push for
real navigations.

---

## 5. Route params

```tsx
const { taskId } = useParams<{ taskId: string }>();   // string | undefined
```

It is `undefined`-able because TypeScript cannot know which route rendered the
component. Handle it rather than asserting with `!` — the undefined case is
exactly what happens when someone renders it from the wrong route.

---

## 6. Error boundaries and 404s

```tsx
{ path: '/', element: <RootLayout />, errorElement: <NotFoundPage /> }
```

`useRouteError()` returns whatever was thrown during matching, loading or
rendering. Without an `errorElement`, one thrown error unmounts the entire tree
and the user gets a **blank white page** — the worst failure mode there is,
because it is indistinguishable from a crashed browser.

`isRouteErrorResponse(error)` narrows a thrown `Response` (e.g. a 404 from a
loader) so you can show the status.

---

## 7. Code splitting

```tsx
const AboutPage = lazy(() => import('./routes/AboutPage.tsx').then((m) => ({ default: m.AboutPage })));

<Suspense fallback={<p>Loading page...</p>}>
  <AboutPage />
</Suspense>
```

The route's JavaScript becomes a separate chunk, downloaded on first visit. On a
real app this is the difference between a 2MB first load and a 200KB one. Split
at route boundaries first — it is where the payoff is largest and the risk is
lowest.

---

## PART TWO — TESTING

## 8. The principle

> "The more your tests resemble the way your software is used, the more
> confidence they can give you." — Kent C. Dodds

Concretely:

| Don't test | Do test |
|---|---|
| Component state | What the user sees |
| That a handler was called | What happens as a result |
| CSS class names | Roles, labels, and accessible names |
| Implementation details | Behaviour through the public surface |

A test coupled to implementation fails on every refactor and passes through
every real bug. That is worse than no test, because it costs maintenance and
provides no safety.

---

## 9. The query priority ladder

Work down this list and stop at the first that fits:

| # | Query | Use for |
|---|---|---|
| 1 | `getByRole(role, { name })` | **Almost everything.** Buttons, links, headings, inputs |
| 2 | `getByLabelText` | Form fields |
| 3 | `getByPlaceholderText` | When there is genuinely no label |
| 4 | `getByText` | Non-interactive content |
| 5 | `getByDisplayValue` | Current input values |
| 6 | `getByTestId` | The escape hatch — not the default |

Why roles first: **a test written with roles is also an accessibility check.**
If `getByRole('button', { name: 'Add task' })` cannot find your button, neither
can a screen reader user.

### `getBy` vs `queryBy` vs `findBy`

| Prefix | Not found | Async | Use for |
|---|---|---|---|
| `getBy` | Throws | No | It should be there now |
| `queryBy` | Returns `null` | No | Asserting **absence** |
| `findBy` | Throws | **Yes** — retries | Anything that loads |

```tsx
expect(await screen.findByRole('link', { name: 'Set up routing' })).toBeInTheDocument();
expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
```

`findBy*` is why there is not a single `sleep` in this test suite. An arbitrary
`await sleep(500)` is both slow and flaky; `findBy*` retries until the element
appears or times out.

---

## 10. `userEvent`, not `fireEvent`

```tsx
const user = userEvent.setup();     // BEFORE render
await user.click(button);
await user.type(input, 'hello');
await user.tab();
await user.keyboard('Enter{Enter}');
```

`fireEvent.click` dispatches one synthetic `click`. `user.click` fires the whole
realistic sequence — `pointerdown`, `mousedown`, `focus`, `pointerup`,
`mouseup`, `click` — and respects `disabled` and `pointer-events: none`.

It catches bugs `fireEvent` sails past: a disabled button that still fires, a
handler that depends on focus, a form that only submits on a real `Enter`.

Every `userEvent` method is async. Always `await`.

---

## 11. Test setup that stays maintainable

`src/test/renderApp.tsx` wraps the providers once. Two decisions in it are worth
copying:

**A fresh `QueryClient` per test.**

```ts
function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}
```

Sharing one leaks cached data between tests, so test *order* starts to matter
and you get failures that vanish in isolation. This is the single most common
cause of flaky React Query tests.

`retry: false` matters too: a deliberately-failing request would otherwise take
three timeouts to report, and your suite would just be slow.

**`createMemoryRouter` with the app's real `routes`.**

```ts
const router = createMemoryRouter(routes, { initialEntries: ['/tasks/2'] });
```

History lives in memory, so routing is testable in jsdom — and because it uses
the **same `routes` array the app does**, the test exercises the real route
table. A test that declares its own routes is testing a fiction.

---

## 12. What the suite actually covers

Read `src/routes/routing.test.tsx` and `src/components/QuickAdd.test.tsx`. The
tests worth studying:

- **Deep linking** — rendering `/tasks/3` directly, not by clicking to it
- **URL as state** — the filter round-trips through `?status=`
- **`aria-pressed`, not a CSS class** — the assertion is on the accessible state
- **`toHaveAccessibleDescription`** — proves the error message actually reaches
  an assistive-tech user via `aria-describedby`, rather than that a class exists
- **The in-flight state** — a promise the test controls, so it can assert the
  button is disabled *mid-save*
- **Re-enabled after a FAILED save** — the regression a missing `finally` causes,
  which locks the form forever after one error
- **Keyboard only** — `user.tab()` then `Enter`, which is a thing you silently
  lose the moment you replace `<form>` with a `<div>`

That last group is the point: these are tests for *behaviour users depend on*,
not for internals.

---

## 13. jsdom is not a browser

`vite.config.ts` sets `environment: 'jsdom'` — a JavaScript implementation of
the DOM. It is fast and sufficient for component tests, but it has **no layout
and no paint**. So:

| Test in jsdom | Test in a real browser (Playwright) |
|---|---|
| Logic, state, conditional rendering | Visual regressions |
| Roles, labels, ARIA wiring | CSS behaviour, media queries |
| Form validation and submission | Real navigation, file downloads |
| Routing with `createMemoryRouter` | Cross-browser differences |

`element.getBoundingClientRect()` returns zeros in jsdom. If your test needs
real geometry, it is an end-to-end test.

---

## 14. Exercises

### Exercise 1 — Test the not-found route properly
Assert that clicking "Back to the task list" from `/nope` returns to `/` and
shows the list.

### Exercise 2 — Route loaders
Move data fetching into a React Router `loader` and read it with
`useLoaderData`. Compare with the `useQuery` approach — which one gives you
caching, and which one gives you data before the component renders?

### Exercise 3 — A protected route
Add `/settings` behind an auth check. Redirect to `/login` when signed out,
**preserving the intended destination** so login can send them back.
*Test both paths.*

### Exercise 4 — Sort in the URL
Add a `?sort=` param alongside `?status=`. Make sure changing one does not wipe
the other — the classic `setSearchParams` bug.
*Write the test first. It should fail before you fix it.*

### Exercise 5 — Break something on purpose
Change `<button aria-label="Delete task">` to `<div onClick={...}>`. Watch which
tests fail and read the error. That failure is your accessibility check working.

### Exercise 6 — Coverage, read sceptically
Run `npx vitest run --coverage`. Find one file with high coverage and weak
tests. Coverage measures which lines *ran*, never whether the assertions were
worth making.

---

## 15. Checklist

- [ ] What `<Outlet />` does, and why the layout not re-mounting matters
- [ ] Why `<Link>` beats `<div onClick={navigate}>`
- [ ] Which state belongs in the URL, and when to use `replace: true`
- [ ] What an `errorElement` prevents
- [ ] Why `getByRole` is first on the priority ladder
- [ ] `getBy` vs `queryBy` vs `findBy`
- [ ] Why `userEvent` catches bugs `fireEvent` misses
- [ ] Why each test needs its own `QueryClient`
- [ ] What jsdom cannot test, and what to use instead

---

## 16. Further reading

- [React Router — Route configuration](https://reactrouter.com/start/data/routing)
- [Testing Library — Guiding principles](https://testing-library.com/docs/guiding-principles)
- [Testing Library — About queries](https://testing-library.com/docs/queries/about#priority)
- [Kent C. Dodds — Testing implementation details](https://kentcdodds.com/blog/testing-implementation-details)

**Next:** [Frontend Final Project](../final-project/README.md) — but do the
[backend track](../../backend/stage-1-node-fundamentals/LESSON.md) first, since
the final project's UI talks to the API you build there.

# Frontend Final Project — Task Manager UI

> Everything from the frontend track, consuming the **real PostgreSQL-backed
> API** you built in `backend/final-project`.

| | |
|---|---|
| **Time** | ~3 hours to read, understand and extend |
| **Prerequisites** | Frontend stages 1–7, and a running [backend final project](../../backend/final-project/README.md) |
| **Tests** | 18 tests, stubbing `fetch` at the network boundary |

---

## 1. Run it

Start the API first — the UI has nothing to talk to otherwise:

```bash
npm run db:setup      # from the repo root, once
npm run api           # terminal 1 - http://localhost:3000
npm run web           # terminal 2 - http://localhost:5173
```

Sign in with the seeded account:

```
demo@example.com / demo-password-1234
```

```bash
npm test      --workspace frontend-final-project
npm run build --workspace frontend-final-project
```

### No CORS in development

`vite.config.ts` proxies `/api` and `/auth` to `http://localhost:3000`, so the
browser makes **same-origin** requests and CORS never comes into it.

That is why `VITE_API_BASE_URL` is empty in `.env.example`. Set it to your API's
origin only when you deploy the frontend separately — and then the backend's
`CORS_ORIGINS` allow-list has to include your frontend's origin.

> **Anything behind a `VITE_` prefix is compiled into the bundle and shipped to
> every visitor.** Put a URL there; never a secret. There is no such thing as a
> secret in a browser app.

---

## 2. What it does

- **Register / sign in**, with server-side field errors landing under the right
  inputs
- **Protected routes** that remember where you were heading
- **List tasks** with search, status filter and sort — all in the URL
- **Pagination**, keeping the previous page visible while the next loads
- **Create tasks**, validated on the client and again by the server
- **Toggle and delete optimistically**, with rollback when the server refuses
- **Stats** computed by the server across *all* your tasks, not the current page

---

## 3. Decisions worth reading the code for

### The API client is the only module that knows about `fetch`

`src/api/client.ts` owns the base URL, the auth header, error shapes and
response parsing. Nothing above it knows HTTP exists — which is why Stage 6's UI
could run against an in-memory fake and this one runs against real PostgreSQL
with no component changes.

Three things it fixes about raw `fetch`:

```ts
// 1. fetch does NOT reject on 4xx/5xx. A 500 resolves with ok: false.
if (!response.ok) throw new ApiError(...)

// 2. fetch has no timeout. AbortSignal genuinely cancels the request.
signal: AbortSignal.timeout(15_000)

// 3. An nginx 502 returns HTML; response.json() would throw a useless SyntaxError.
const text = await response.text();
```

### Responses are parsed, not asserted

```ts
const parsed = taskPageSchema.safeParse(payload);
```

`await response.json() as Task[]` is a lie — nothing checks it at runtime. Here,
a backend change that renames a field fails **loudly at the boundary**, naming
the field, instead of surfacing as `undefined` three components away.

### The token is part of every query key

```ts
all: (token: string) => ['tasks', token] as const
```

Not an oversight. Without it, signing in as a different user shows the previous
user's cached tasks — a real data-leak bug in apps that key only on filters.

### Filters live in the URL

Survives a refresh, bookmarkable, shareable, works with the back button. And
`setParam` copies the existing params rather than replacing them — the classic
`setSearchParams` bug is wiping the params you did not touch, and there is a
test for it.

### Optimistic updates with rollback

```ts
onMutate:  cancelQueries → snapshot → apply the guess
onError:   restore the snapshot
onSettled: invalidate — the server has the last word
```

`cancelQueries` is the step everyone skips: without it, a refetch that started
*before* your optimistic write can land *after* it and overwrite the guess with
stale data.

The delete mutation snapshots the **whole page**, not just the task, because
restoring on failure has to put the row back at its original index.

### Stats come from the server

The page holds 10 of 47 tasks. Counting locally would show "3 of 10 done" while
the user has 47. Derived data belongs with whoever holds the full dataset.

### `retry` and the error type

```ts
const retryPolicy = (failureCount: number, error: ApiError) => { ... }
```

Typing that parameter `unknown` silently widens `query.error` to `unknown`
across the whole app, and `query.error.message` stops compiling for a reason
that has nothing to do with errors. `src/types/react-query.d.ts` registers
`ApiError` as the default error type so it flows through everywhere.

---

## 4. Where the token lives — an honest trade-off

This app stores the access token in `localStorage`. That is the common choice
for a token-based SPA and **not the most secure option**:

| | XSS can steal it | Survives reload | Needs CSRF protection |
|---|---|---|---|
| `localStorage` | **Yes** | Yes | No |
| Memory only | Only while open | No | No |
| **httpOnly cookie** | **No** | Yes | **Yes** |

An httpOnly cookie with `SameSite=Lax` and `Secure` is the better production
default — JavaScript cannot read it, so XSS cannot steal it. The cost is that
the browser attaches it automatically, which is exactly why you then need CSRF
protection.

The mitigation that applies either way: **the access token is short-lived**
(15 minutes), so a stolen one has a small window. Moving to cookies is
Exercise 3.

`ProtectedRoute` is a **UX guard, not a security boundary**. The API enforces
access control; a client-side check only decides what to render.

---

## 5. What the 18 tests cover

`fetch` is stubbed at the **network boundary**, not by mocking `api/client.ts`.
That means the real client runs — its error handling, its zod parsing, its
header building — so the tests exercise the same code path production does.

- Anonymous visitors are redirected, and the intended destination is remembered
- Sign-in persists the token and lands on the task list
- A failed sign-in shows the server's message **and re-enables the form**
- An unreachable API produces an actionable message, not a hang
- Registration renders server-side field errors via `aria-describedby`
- The request carries `Authorization: Bearer`, not a query parameter
- "Loaded but empty" is distinct from "loading"
- A 500 shows an error with a retry button
- Filters round-trip through the URL **without dropping the others**
- Stats show the server's totals, not the page's
- Client validation blocks the request entirely
- A 409 lands under the title field
- An optimistic toggle **rolls back** when the server refuses
- Every control has an accessible name

---

## 6. Exercises

### Exercise 1 — Edit a task
Add inline editing. Reset the editor's state with `key={task.id}` rather than a
sync effect ([Stage 5 §9](../stage-5-state-management/LESSON.md)).

### Exercise 2 — Handle an expired token globally
The access token expires after 15 minutes. Right now that surfaces as an error.
Add a global handler that logs out and redirects on any 401.
*Hint: `QueryCache`'s `onError`, plus `isSessionExpired` in `AuthProvider`.*

### Exercise 3 — Move to httpOnly cookies
Change the API to set an httpOnly cookie, drop `localStorage`, and add CSRF
protection. Which class of attack does this close, and which does it open?

### Exercise 4 — Infinite scroll
Replace the pager with `useInfiniteQuery`. Note how `getNextPageParam` derives
the cursor from `meta` — the server tells the client when to stop.

### Exercise 5 — Offline support
Persist the query cache to `localStorage` with
`@tanstack/query-sync-storage-persister`. Queue mutations while offline and
replay them on reconnect. *Consider what happens when a queued mutation
conflicts with a change made elsewhere.*

### Exercise 6 — An end-to-end test
Add Playwright and drive a real browser against a running API and database.
*This is the layer jsdom cannot reach — real navigation, real CSS, real
cross-browser behaviour.*

### Exercise 7 — Audit it
Run Lighthouse. Tab through the whole app with the keyboard only. Turn on a
screen reader and add a task. Fix what you find.

---

## 7. Where to look first

```
src/
├── api/
│   ├── client.ts        ← START HERE. fetch, errors, zod parsing.
│   └── queries.ts       ← query keys, staleTime, optimistic mutations
├── auth/AuthProvider.tsx← token storage, and the trade-off it makes
├── routes.tsx           ← the route table, shared with the tests
├── routes/
│   ├── AppLayout.tsx    ← layout, ProtectedRoute, PublicOnlyRoute
│   └── TasksPage.tsx    ← filters in the URL, the four query states
├── components/          ← presentational: TaskForm, TaskRow, StatsBar
├── types/react-query.d.ts ← registering ApiError as the default error type
└── app.test.tsx         ← 18 tests against a stubbed network
```

**Back to:** [the curriculum](../../docs/curriculum.md)

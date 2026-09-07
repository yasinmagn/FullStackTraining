# Curriculum

Sixteen stages and two final projects. Roughly **40–45 hours** if you do the
exercises, which is where most of the learning is.

Start at [docs/00-setup.md](00-setup.md) if you have not installed anything yet.

---

## Which path?

### Full stack, in order — the default

Frontend 1–7, then backend 1–7, then both final projects. The frontend gives you
TypeScript and testing fluency that the backend then assumes.

### Backend first

Do **frontend stages 2 and 3** (JavaScript and TypeScript) first — the backend
track assumes both — then backend 1–7. Come back for the frontend afterwards.

### I already know the basics

| You know | Start at |
|---|---|
| HTML, CSS, modern JS | Frontend 3 (TypeScript) |
| TypeScript, some React | Frontend 5 (**State**) — most people have gaps here |
| React well | Frontend 6 (Data fetching) |
| Node and Express | Backend 3 (REST design) |
| SQL | Backend 5 (Migrations), then 6 (Security) |

**Two stages are worth doing even if you think you know them:**
**frontend stage 5** (state) and **backend stage 6** (security). They are the
two areas where confident developers most often have expensive gaps.

---

## Frontend

| # | Stage | Time | Core idea |
|---|---|---|---|
| 1 | [Web Foundations](../frontend/stage-1-web-foundations/LESSON.md) | 1.5h | Semantic HTML, CSS layout, the DOM by hand — so React looks like a convenience, not magic |
| 2 | [JavaScript Essentials](../frontend/stage-2-javascript-essentials/LESSON.md) | 2h | Immutability, async control flow, and why `fetch` doesn't throw on a 500 |
| 3 | [TypeScript](../frontend/stage-3-typescript/LESSON.md) | 2h | Types as a design tool: illegal states become unwriteable |
| 4 | [React Components](../frontend/stage-4-react-components/LESSON.md) | 2h | Composition with slots; what index keys actually break |
| 5 | [**State Management**](../frontend/stage-5-state-management/LESSON.md) | 3h | What is state, where it lives, which tool holds it |
| 6 | [Data Fetching & Forms](../frontend/stage-6-data-fetching-forms/LESSON.md) | 3h | Server data is a cache, not state |
| 7 | [Routing & Testing](../frontend/stage-7-routing-testing/LESSON.md) | 2.5h | The URL is state; test what users do |
| ★ | [Final project](../frontend/final-project/README.md) | 3h | The whole track, against the real API |

## Backend

| # | Stage | Time | Core idea | DB? |
|---|---|---|---|---|
| 1 | [Node Fundamentals](../backend/stage-1-node-fundamentals/LESSON.md) | 2h | Fail fast at boot; handle SIGTERM | — |
| 2 | [HTTP & Express](../backend/stage-2-http-express/LESSON.md) | 2.5h | What a framework actually does for you | — |
| 3 | [REST API Design](../backend/stage-3-rest-api-design/LESSON.md) | 3h | Layers, and what each must not import | — |
| 4 | [SQL & PostgreSQL](../backend/stage-4-sql-postgres/LESSON.md) | 4h | Let the database defend your data | **yes** |
| 5 | [Migrations & Data Access](../backend/stage-5-data-access-migrations/LESSON.md) | 3h | Evolving a schema you cannot drop | **yes** |
| 6 | [**Auth & Security**](../backend/stage-6-auth-security/LESSON.md) | 3.5h | Authorisation is the bug you will ship | — |
| 7 | [Testing & Observability](../backend/stage-7-testing-observability/LESSON.md) | 3h | Make a running service explain itself | — |
| ★ | [Final project](../backend/final-project/README.md) | 4h | The whole track, on real PostgreSQL | **yes** |

---

## How to work through a stage

1. **Run it first.** Every stage has a `npm run dev` or `npm test`. Poke at it
   before reading.
2. **Read `LESSON.md`** with the code open beside it. The comments carry
   material the lesson does not repeat.
3. **Do the exercises.** This is where the learning happens. Several ask you to
   break something deliberately and watch the right test fail — those take five
   minutes and teach more than an hour of reading.
4. **Answer the checklist** at the end, out loud. If you cannot explain
   something, that is the bit to re-read.

### Exercise tests ship skipped

So the repo is green before you start. Change `describe.skip` to `describe` when
you begin a stage's exercises.

---

## Threads that run through everything

Some ideas recur deliberately, each time at a higher level. Noticing them is
most of the point.

### Derived state should be computed, not stored

| Where |
|---|
| Frontend 1 — `visibleTasks()` computed in `render()` |
| Frontend 4 — `TaskStats` has no `useState` |
| Frontend 5 — selectors beside the reducer; `TasksState` holds nothing derivable |
| Backend 3 — `total` computed from the filtered set |
| Final projects — `completedAt` derived from status; stats computed by whoever holds the full dataset |

### Validate at the boundary; trust nothing from outside

| Where |
|---|
| Frontend 1 — `textContent`, never `innerHTML` |
| Frontend 3 — parse, don't validate |
| Frontend 6 & final — zod on every API response |
| Backend 1 — a JSON file on disk is external input |
| Backend 3 — zod at the edge, with an allow-list that stops mass assignment |
| Backend 4/5 — the database as the last line of defence |

### The database is a participant, not a bucket

| Where |
|---|
| Backend 4 — constraints, `ON DELETE`, indexes, transactions |
| Backend 5 — SQLSTATE codes translated into domain errors |
| Final project — a `CHECK` enforcing `completed_at`, a trigger owning `updated_at` |

### Failure is a feature you have to build

| Where |
|---|
| Frontend 2 — retries with backoff, only for what might succeed |
| Frontend 6 — the chaos panel, and optimistic rollback |
| Backend 2 — one missed error hangs the request forever |
| Backend 7 — liveness vs readiness, and graceful shutdown |

### Say what the trade-off is

Several places present a genuine choice rather than a single right answer:
sessions vs JWTs (backend 6), where the token lives (frontend final project),
offset vs cursor pagination (backend 3), user enumeration on registration
(backend 6). Being able to argue both sides is the skill.

---

## After you finish

The exercises at the end of each final project are the natural continuation —
particularly:

- **Sharing a task with another user** (backend final, exercise 5). Your single
  `owner_id = $1` clause stops being sufficient, and you have to decide where
  the new rule lives without scattering authorisation across every route.
- **Moving the token to httpOnly cookies** (frontend final, exercise 3). Closes
  one class of attack and opens another.
- **Deploying it** (backend final, exercise 6). Migrations as a release step,
  real secrets in a secret store, `DATABASE_SSL=true`.

---

## Reference

- [docs/00-setup.md](00-setup.md) — installation and troubleshooting
- [docs/glossary.md](glossary.md) — terms used across the lessons
- [../README.md](../README.md) — overview and commands

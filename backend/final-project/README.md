# Backend Final Project — Task API on PostgreSQL

> Everything from the backend track, assembled into one production-shaped
> service that talks to **your real PostgreSQL database**, using the
> `DATABASE_URL` from your `.env`.

| | |
|---|---|
| **Time** | ~4 hours to read, understand and extend |
| **Prerequisites** | Backend stages 1–7 |
| **Tests** | 41 end-to-end tests against a real database |

---

## 1. Set it up

### 1.1 A database

Any PostgreSQL 14+ will do — a local install, Docker, or a managed provider
(Neon, Supabase, Railway, RDS):

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
createdb fullstack_training
createdb fullstack_training_test      # for the test suite
```

### 1.2 Your credentials

```bash
npm run setup          # from the repo root: creates .env from .env.example
```

Then edit `.env`:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE_test
DATABASE_SSL=false          # true for most managed providers
JWT_SECRET=<a long random string>
```

Generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> ### Credentials never enter this repository
>
> - `.env` is in `.gitignore`. Only `.env.example`, with placeholders, is
>   committed.
> - `src/config/index.ts` reads `process.env` and nothing else — there is no
>   connection string, password or secret in any tracked file.
> - `npm run check:secrets` from the repo root fails the build if anything
>   credential-shaped ever reaches a tracked file. It catches Postgres URLs
>   with inline passwords, JWTs, GitHub tokens, API keys and private keys.
> - Connection strings are redacted before they are logged
>   (`safeDatabaseUrl`), so the host and database appear in your logs and the
>   password does not.
>
> **Precedence:** a real environment variable beats `.env` — `dotenv` does not
> overwrite what is already set. That is correct (production sets real env vars),
> and occasionally surprising. If edits to `.env` seem to do nothing, check
> `echo $DATABASE_URL`.

### 1.3 Run it

```bash
npm install                    # once, from the repo root
npm run db:setup               # migrate + seed
npm run api                    # http://localhost:3000
```

Or per-workspace:

```bash
npm run db:migrate:status --workspace backend-final-project
npm run db:migrate        --workspace backend-final-project
npm run db:seed           --workspace backend-final-project
npm run dev               --workspace backend-final-project
npm test                  --workspace backend-final-project
```

### 1.4 Try it

```bash
curl localhost:3000/health/ready

TOKEN=$(curl -s -X POST localhost:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"demo@example.com","password":"demo-password-1234"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0)).data.accessToken")

curl "localhost:3000/api/tasks?sort=priority&order=asc" -H "authorization: Bearer $TOKEN"
curl localhost:3000/api/tasks/stats -H "authorization: Bearer $TOKEN"
```

### If it will not connect

`src/db/pool.ts` translates the common failures:

| Symptom | Meaning |
|---|---|
| `ECONNREFUSED` | Nothing listening. Is PostgreSQL running? |
| `28P01` | Password authentication failed |
| `3D000` | That database does not exist — `createdb` it |
| `ETIMEDOUT` | Firewall or wrong host. Managed providers usually need `DATABASE_SSL=true` |

The server **verifies the database before binding a port**. Refusing to start is
better than starting and failing every request.

---

## 2. The API

All `/api/tasks` routes require `Authorization: Bearer <token>`.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health/live` | Liveness — process only, **never** touches the database |
| `GET` | `/health/ready` | Readiness — runs `SELECT 1`; 503 when the database is down |
| `POST` | `/auth/register` | 201, returns user + access token |
| `POST` | `/auth/login` | 200, returns user + access token |
| `GET` | `/auth/me` | The current user |
| `GET` | `/api/tasks` | `?status= &priority= &q= &page= &pageSize= &sort= &order=` |
| `GET` | `/api/tasks/stats` | Counts for the current user |
| `POST` | `/api/tasks` | 201 + `Location` |
| `GET` | `/api/tasks/:id` | 404 for someone else's task — **deliberately not 403** |
| `PATCH` | `/api/tasks/:id` | Partial update; empty body is 400 |
| `DELETE` | `/api/tasks/:id` | 204 |

### Response shapes

```jsonc
// one
{ "data": { "id": "...", "title": "..." } }

// many
{ "data": [ ... ], "meta": { "total": 42, "page": 1, "pageSize": 20, "totalPages": 3 } }

// error — the SAME shape for 400, 401, 404, 405, 409, 413 and 500
{ "error": { "code": "NOT_FOUND", "message": "...", "details": {}, "requestId": "..." } }
```

`code` is for machines; `message` is for humans and may be reworded without
breaking anyone.

---

## 3. Architecture

```
  server.ts                    composition root - the ONLY file that wires things
       │
  http/app.ts  routes.ts       parse, status codes, headers      ← knows HTTP
       │
  service/                     BUSINESS RULES                    ← knows neither
       │
  repository/                  SQL                               ← knows the DB
       │
  domain/                      types, schemas, pure rules        ← knows nothing
```

Dependencies point **inwards**. What each layer does *not* import is the point:

| Layer | Never imports |
|---|---|
| `domain/` | express, pg — anything |
| `service/` | express, pg, zod |
| `repository/` | express |
| `http/` | — it is the edge |

Every component is a `createX(dependencies)` factory. Nothing constructs its own
collaborators, which is why the whole API can be built around a test database in
`beforeEach` with no global state.

**`createApp` does not call `listen`.** That single decision is what lets 41
tests drive the entire real stack in-process.

---

## 4. Decisions worth reading the code for

Each links back to the stage that explains it.

### Security

| Decision | Where | Why |
|---|---|---|
| Queries scoped by `owner_id` in the SQL | `repository/taskRepository.ts` | There is no check to forget, and none for a future editor to delete ([Stage 6](../stage-6-auth-security/LESSON.md)) |
| Someone else's task returns **404, not 403** | `service/taskService.ts` | A 403 confirms the id exists, allowing enumeration |
| Schemas omit `id`, `ownerId`, `status`, `role` | `domain/index.ts` | zod strips them — the mass-assignment defence |
| Every value parameterised | `repository/` | Not escaping — the value never becomes part of the SQL text |
| Sorting via a lookup table | `repository/taskRepository.ts` | Column names cannot be parameterised; the enum is the allow-list |
| bcrypt cost 12 + a dummy hash on login | `service/authService.ts` | Otherwise timing alone enumerates every account |
| `algorithms: ['HS256']` on verify | `service/authService.ts` | Closes `alg:none` and RS256→HS256 confusion |
| No default for `JWT_SECRET` | `config/index.ts` | A fallback ships to production the first time an env var is forgotten |
| Body limit, rate limit, helmet, CORS allow-list | `http/app.ts` | ([Stage 6](../stage-6-auth-security/LESSON.md)) |
| 500s log everything and return nothing | `http/app.ts` | A stack trace leaks your layout, versions and schema |

### Data

| Decision | Where | Why |
|---|---|---|
| Migrations with an advisory lock + checksums | `db/migrator.ts` | Concurrent deploys cannot race; an edited migration is caught ([Stage 5](../stage-5-data-access-migrations/LESSON.md)) |
| Its own migrations ledger | `cli/migrate.ts` | Two components sharing a database would collide on `001` |
| `timestamptz` everywhere, `date` for due dates | `migrations/` | A due date is a calendar day, not an instant ([Stage 4](../stage-4-sql-postgres/LESSON.md)) |
| `DATE` formatted from local components | `repository/taskRepository.ts` | `toISOString()` shifts the day west of UTC |
| Unique index on `(owner_id, lower(title))` | `migrations/002` | Under concurrency the index is the only check that holds |
| Cross-column CHECK on `completed_at` | `migrations/002` | The invariant survives manual `UPDATE`s from psql |
| `updated_at` by trigger | `migrations/003` | Application code forgets; the database does not |
| `count(*) OVER ()` for the page total | `repository/taskRepository.ts` | One round trip, and the two cannot disagree |
| Malformed UUID → `null`, not `22P02` | `repository/` | "Invalid id" and "no such id" are the same to a client |
| `withTransaction` with `release()` in `finally` | `db/pool.ts` | A leaked client exhausts the pool and the app hangs silently |

### Operations

| Decision | Where | Why |
|---|---|---|
| Config validated at boot, one clear error | `config/index.ts` | Beats `undefined` surfacing in a request at 3am |
| Database verified before binding a port | `server.ts` | Refusing to start beats failing every request |
| Liveness never touches the database | `http/app.ts` | Otherwise a blip restarts every pod at once ([Stage 7](../stage-7-testing-observability/LESSON.md)) |
| Structured logs with a per-request child logger | `http/middleware.ts` | "Everything for this request" is a field filter |
| Route pattern captured in `res.end` | `http/middleware.ts` | `req.baseUrl` is already restored by the time `finish` fires |
| Central redaction in the logger | `observability/logger.ts` | Fails safe when someone logs a whole request body |
| Graceful shutdown with a hard timeout | `server.ts` | A hung request must not block a deploy |

---

## 5. What the 41 tests prove

They use the **real database, real migrations, real constraints and real
middleware**. Nothing is mocked, because the bugs live where a mock would paper
over them.

- **IDOR** — a second real user gets 404, and the title does not leak
- **Mass assignment** — `id`, `ownerId`, `status`, `role` from the body are ignored
- **SQL injection** — `'; DROP TABLE tasks; --` through the search term; the table survives
- **Password storage** — the row contains a `$2b$12$` hash, never the password
- **User enumeration** — identical error for unknown email and wrong password
- **Token forgery** — a token signed with another secret is rejected
- **Uniqueness** — duplicate title per owner is 409; the same title for a *different* owner is fine
- **Derived state** — `completedAt` is set on done, cleared on reopen
- **The trigger** — `updatedAt` moves without the `UPDATE` mentioning it
- **Time zones** — `2026-03-01` comes back as `2026-03-01`
- **Sorting** — priority sorts by meaning; nulls sort last
- **Limits** — `pageSize=1000000` → 400, a 200KB body → 413
- **Config safety** — a weak `JWT_SECRET` throws; a logged URL is redacted
- **500s** — a thrown connection string is logged and never returned

> The suite requires `TEST_DATABASE_URL` and **deliberately does not fall back
> to `DATABASE_URL`** — `beforeEach` truncates, and a fallback would wipe your
> real data. It skips when unset, so `npm test` at the repo root stays green.

---

## 6. Exercises

### Exercise 1 — Tags
Add `tags` and `task_tags` with a composite primary key. Support `?tag=` and
return tags with each task in **one** query using `LEFT JOIN LATERAL` +
`json_agg` ([Stage 4 §4](../stage-4-sql-postgres/LESSON.md)) — not N+1.

### Exercise 2 — Refresh tokens
Access tokens are 15 minutes and cannot be revoked. Add `/auth/refresh` with
opaque, hashed, rotating refresh tokens. Detect reuse of a rotated token and
revoke the family.

### Exercise 3 — Optimistic concurrency
Add a `version` column. Have `PATCH` accept `If-Match` and return **412** on a
mismatch. Two clients editing the same task should no longer silently overwrite
each other.

### Exercise 4 — Cursor pagination
Add `?after=`, ordering by `(created_at, id)`. Note the tuple comparison — it is
what makes the cursor correct when timestamps tie.

### Exercise 5 — Sharing
Let a user share a task read-only with another. This is the exercise that will
teach you the most: your **single** `owner_id = $1` clause is no longer
sufficient, and you must decide where the new rule lives without scattering
authorisation across every route.

### Exercise 6 — Deploy it
Deploy to Fly.io, Railway or Render with a managed database. You will need
`DATABASE_SSL=true`, migrations as a release step, and real secrets in your
platform's secret store — **never** a committed `.env`.

### Exercise 7 — Load-test it
Use `autocannon` against `GET /api/tasks`. Then `EXPLAIN ANALYZE` the query it
runs, drop `tasks_owner_status_created_idx`, and measure again.

---

## 7. Where to look first

```
src/
├── config/index.ts             ← START HERE. Where DATABASE_URL is read.
├── server.ts                   ← composition root: how everything is wired
├── domain/index.ts             ← types, schemas, business rules
├── db/
│   ├── pool.ts                 ← pooling, withTransaction, error translation
│   └── migrator.ts             ← the migration runner
├── repository/                 ← SQL, parameterised, owner-scoped
├── service/                    ← business rules, no HTTP, no SQL
├── http/                       ← routes, middleware, the error table
├── observability/              ← logger, health checks
├── cli/                        ← migrate, seed
└── api.test.ts                 ← 41 tests against a real database
```

**Next:** [Frontend Final Project](../../frontend/final-project/README.md) — the
UI that consumes this API.

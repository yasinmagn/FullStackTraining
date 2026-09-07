# Full Stack Training

A staged, hands-on curriculum: **8 frontend lessons**, **8 backend lessons**, and
two final projects that meet in the middle — a React app talking to a
PostgreSQL-backed API.

Every stage is **runnable**. Every lesson explains not just *what* to do but
*what goes wrong if you don't*, and the failure modes are demonstrated in code
rather than described.

```
frontend/  1 Web foundations → 2 JavaScript → 3 TypeScript → 4 Components
           → 5 State → 6 Data fetching → 7 Routing & testing → Final project

backend/   1 Node → 2 HTTP & Express → 3 REST design → 4 SQL & PostgreSQL
           → 5 Migrations & data access → 6 Auth & security
           → 7 Testing & observability → Final project
```

---

## Quick start

**Requirements:** Node 20.11+ and (from backend stage 4 onwards) PostgreSQL 14+.

```bash
git clone https://github.com/yasinmagn/FullStackTraining.git
cd FullStackTraining

npm run setup      # creates .env from .env.example
npm install        # installs every lesson at once (npm workspaces)
npm test           # runs every test suite
```

Then open **[docs/curriculum.md](docs/curriculum.md)** and start at whichever
stage matches what you already know.

To run the final projects against a real database:

```bash
# 1. edit .env - set DATABASE_URL and JWT_SECRET
npm run db:setup   # migrate + seed
npm run api        # terminal 1 - http://localhost:3000
npm run web        # terminal 2 - http://localhost:5173
```

Full setup instructions, including PostgreSQL: **[docs/00-setup.md](docs/00-setup.md)**

---

## Credentials never enter this repository

This matters more than any lesson in it.

- **`.env` is git-ignored.** Only `.env.example`, containing placeholders, is
  committed.
- **No connection string, password or token appears in any tracked file.** Code
  reads `process.env` and nothing else.
- **`npm run check:secrets`** scans every git-tracked file for Postgres URLs
  with inline passwords, JWTs, GitHub tokens, API keys and private key blocks,
  and fails if it finds one. A genuine false positive is silenced with an
  explicit, greppable `check-secrets:allow` comment — never by weakening a rule.
- **Connection strings are redacted before logging**, so the host and database
  appear in your logs and the password does not.
- **Secrets are logged as `[redacted]`** by the structured logger, centrally, so
  the person adding a log line does not have to remember.

```bash
npm run check:secrets
```

Wire it into git so it runs before every commit — see
[docs/00-setup.md](docs/00-setup.md#optional-a-pre-commit-hook).

> If a secret has *ever* been committed, it is compromised forever: git history
> is permanent and someone may already have cloned it. **Rotate it.** Deleting
> the line is not enough.

---

## What you build

### Frontend

| Stage | Lesson | You build |
|---|---|---|
| 1 | [Web Foundations](frontend/stage-1-web-foundations/LESSON.md) | A task board in semantic HTML, CSS and the raw DOM — no build step |
| 2 | [JavaScript Essentials](frontend/stage-2-javascript-essentials/LESSON.md) | Immutability, async control flow, error handling — 18 tests |
| 3 | [TypeScript](frontend/stage-3-typescript/LESSON.md) | A domain model where illegal states cannot be represented |
| 4 | [React Components](frontend/stage-4-react-components/LESSON.md) | Composition with slots, and what index keys actually break |
| 5 | [**State Management**](frontend/stage-5-state-management/LESSON.md) | A tested reducer, split contexts, custom hooks — 16 tests |
| 6 | [Data Fetching & Forms](frontend/stage-6-data-fetching-forms/LESSON.md) | TanStack Query, optimistic updates, forms with real validation |
| 7 | [Routing & Testing](frontend/stage-7-routing-testing/LESSON.md) | Nested routes, URL-as-state — 18 tests |
| — | [**Final project**](frontend/final-project/README.md) | The Task Manager UI on the real API — 18 tests |

### Backend

| Stage | Lesson | You build |
|---|---|---|
| 1 | [Node Fundamentals](backend/stage-1-node-fundamentals/LESSON.md) | A CLI with validated config and graceful shutdown — 17 tests |
| 2 | [HTTP & Express](backend/stage-2-http-express/LESSON.md) | The same API twice: raw `node:http`, then Express — 22 tests |
| 3 | [REST API Design](backend/stage-3-rest-api-design/LESSON.md) | A layered API with zod validation — 46 tests |
| 4 | [SQL & PostgreSQL](backend/stage-4-sql-postgres/LESSON.md) | A constrained schema, 12 worked queries, an index benchmark |
| 5 | [Migrations & Data Access](backend/stage-5-data-access-migrations/LESSON.md) | A migration runner and a real repository — 24 tests |
| 6 | [Auth & Security](backend/stage-6-auth-security/LESSON.md) | Auth done properly — 32 tests, each mapped to an attack |
| 7 | [Testing & Observability](backend/stage-7-testing-observability/LESSON.md) | Structured logs, metrics, health probes — 23 tests |
| — | [**Final project**](backend/final-project/README.md) | The Task API on real PostgreSQL — 41 tests |

**302 passing tests**, plus 26 more that ship skipped as exercises. They are not
there for coverage: each one pins a specific failure. The most valuable are the ones that fail loudly for bugs that
otherwise reach production silently — the IDOR test, the connection-leak test,
the optimistic-rollback test.

---

## How the lessons are built

Each stage has:

- **`LESSON.md`** — the concepts, the reasoning, and the mistakes, with a
  checklist and further reading
- **Runnable code** — heavily commented, explaining *why* rather than *what*
- **Exercises** — several of which ask you to **break something on purpose** and
  watch the right test fail
- **`SOLUTIONS.md`** where exercises have single right answers

Exercise test suites ship **skipped**, so `npm test` is green before you start.
Un-skip them as you go.

### A note on the code comments

The comments are deliberately denser than production code would warrant. They
carry the teaching. Where a decision has a genuine trade-off, the comment says
so rather than presenting one option as obviously correct — see the token
storage discussion in the frontend final project, or sessions vs JWTs in backend
stage 6.

---

## Repository layout

```
FullStackTraining/
├── .env.example              # the contract: every variable, placeholder values
├── docs/
│   ├── 00-setup.md           # prerequisites, PostgreSQL, troubleshooting
│   ├── curriculum.md         # suggested paths through the material
│   └── glossary.md
├── scripts/
│   ├── setup.mjs             # creates .env, checks your Node version
│   └── check-secrets.mjs     # the credential scanner
├── frontend/                 # 8 stages + final project
└── backend/                  # 8 stages + final project
```

It is an **npm workspaces** monorepo: one `npm install` at the root sets up
every lesson, and shared dependencies are installed once.

---

## Commands

| Command | Does |
|---|---|
| `npm run setup` | Create `.env` from the template |
| `npm install` | Install every workspace |
| `npm test` | Every test suite |
| `npm run typecheck` | Every TypeScript project |
| `npm run check:secrets` | Fail if a credential reached a tracked file |
| `npm run db:setup` | Migrate + seed the final project database |
| `npm run api` | Start the final-project API |
| `npm run web` | Start the final-project UI |

Anything for a single stage:

```bash
npm test --workspace backend-stage-6-auth-security
npm run dev --workspace frontend-stage-5-state-management
```

---

## Stack

Chosen to be current, mainstream and boring in the right places.

| | |
|---|---|
| **Language** | TypeScript 7 (strict, `noUncheckedIndexedAccess` on) |
| **Frontend** | React 19, Vite 8, TanStack Query 5, React Router 7, zod 4 |
| **Backend** | Node 22, Express 5, `pg`, zod 4 |
| **Database** | PostgreSQL 14+ |
| **Testing** | Vitest 5, Testing Library, supertest |

No ORM. That is deliberate: you learn far more SQL writing it than configuring
something to write it for you, and every index, constraint and query plan in
backend stage 4 is something an ORM would have hidden.

---

## Licence

Use it however you like.

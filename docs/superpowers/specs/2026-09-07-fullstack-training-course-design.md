# SooqOnline Full-Stack Training — Course Build Design

**Date:** 2026-09-07
**Author:** Yasin Magan (facilitator) / build by Claude
**Repo:** https://github.com/yasinmagn/FullStackTraining

## Goal

Materialize the `sooqonline-lab-guide.md` progression guide into a browsable,
Microsoft-Learn-style course repository with runnable code for every lesson, plus
a new dedicated **React state management** lesson, and a **final-project backend
wired to a real PostgreSQL database**. Commit everything to GitHub with **no
credentials** in the repo.

## Structure (Microsoft Learn: modules → units)

```
FullStackTraining/
├─ README.md                    Learning-path landing page
├─ .gitignore                   ignores .env, .env.*, .env.txt, node_modules, build output
├─ .env.example                 placeholder DATABASE_URL + JWT_SECRET (safe to commit)
├─ docs/
│   ├─ sooqonline-lab-guide.md  original source guide (reference)
│   └─ superpowers/specs/       this design doc
├─ modules/
│   ├─ 01-static-frontend/      HTML · CSS · JS · DOM (Labs 1–4)
│   ├─ 02-backend-api/          Node HTTP · Express CRUD · layered · JWT (Labs 5–8)
│   ├─ 03-database/             SQL · schema/joins · Prisma (Labs 9–11)
│   └─ 04-frontend-framework/   React · State mgmt (NEW) · Next.js · fullstack auth (Labs 12–14 + states)
└─ final-project/
    ├─ backend/                 sooqonline-api — Express + Prisma + real Postgres
    └─ frontend/                sooqonline-next — Next.js + Tailwind
```

Each **unit** contains:
- `README.md` — MS Learn unit format: Introduction → Learning objectives → Session
  brief → Tasks (numbered) → Verify → Solution walkthrough.
- `starter/` — previous solution + numbered TODO stubs.
- `solution/` — complete, working reference code.

Each **module** has a `README.md` index (objectives + ordered unit list).

## Units

| Module | Unit | Source lab |
|--------|------|------------|
| 01-static-frontend | 01-html-skeleton | Lab 1 |
| | 02-css-styling | Lab 2 |
| | 03-javascript-fundamentals | Lab 3 |
| | 04-dom-and-events | Lab 4 |
| 02-backend-api | 01-raw-node-http | Lab 5 |
| | 02-express-crud | Lab 6 |
| | 03-layered-cart-orders | Lab 7 |
| | 04-auth-jwt | Lab 8 |
| 03-database | 01-sql-basics | Lab 9 |
| | 02-schema-joins-dashboard | Lab 10 |
| | 03-prisma-postgres | Lab 11 |
| 04-frontend-framework | 01-react-shop | Lab 12 |
| | 02-react-state-management | **NEW** |
| | 03-nextjs-shop | Lab 13 |
| | 04-fullstack-auth-checkout | Lab 14 |

## New lesson: React state management (`04-frontend-framework/02-react-state-management`)

Bridges Lab 12 (local `useState`) and Lab 13 (Context). Teaches:
- `useState` vs `useReducer`, when to reach for each.
- Immutable update patterns (spread, map, filter) — never mutate state.
- Lifting state up and prop drilling; why Context solves it.
- Context API: `createContext`, provider, custom hook (`useCart`).

Practical exercise: refactor the Lab 12 cart into a `useReducer` + `CartContext`
so any component can read/update the cart — the exact pattern the Next.js labs use.

## Final-project backend + real database

- Full reference API: schema, seed, transactional atomic-stock checkout, JWT auth.
- A **local `.env` (gitignored)** is created from the real Railway connection
  string; only `.env.example` (placeholder) is committed.
- Verification: run `npx prisma migrate dev` + `node prisma/seed.js` against the
  **live Railway Postgres**, then boot the API and hit `/products`.
  This creates tables and seeds rows in the live database (intended).

## Credentials & Git

- `.gitignore` excludes `.env`, `.env.*`, `.env.txt`, `.env.local`, `node_modules`,
  `.next`, `dist`, Prisma generated client.
- Before pushing: `git status` verified to contain **no** secret files.
- `git init` → remote `https://github.com/yasinmagn/FullStackTraining` → commit → push `main`.
- PDFs are **not** committed (markdown guide only).

## Out of scope (YAGNI)

- No test framework/CI (course is instructor-verified).
- No deployment config.
- No screenshots/appendix images (referenced in guide but not present).

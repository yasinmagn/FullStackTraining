# SooqOnline — Full-Stack Web Development Training

> Fullstack BYOD Training Program · Somaliland Youth Cohort
> Facilitated by **Yasin Magan — CEO, Koobsame.io**

A hands-on, project-based curriculum that takes you from a static HTML page to a
complete, database-backed e-commerce application — **SooqOnline** — built with
Node.js, Express, PostgreSQL, Prisma, React, and Next.js.

The course is organized like a Microsoft Learn learning path: **modules** made of
**units**. Every unit has a short lesson (`README.md`), a `starter/` folder (the
previous unit's solution plus numbered TODOs for you to complete), and a
`solution/` folder (the complete working reference).

---

## How to use this repository

1. Open the module you're on under [`modules/`](./modules).
2. Read the unit `README.md` — it has the objectives, tasks, and a **Verify** checklist.
3. Copy the unit's `starter/` into your own working folder and complete the TODOs.
4. Stuck? Compare against `solution/`. Run the Verify checks before moving on.
5. Build toward the [`final-project/`](./final-project) reference application.

Each unit's starter is the *previous* unit's solution, so if your own code breaks
one week you can pick up cleanly from the next unit's starter — nobody gets left behind.

---

## Learning path

### [Module 01 — Static Frontend](./modules/01-static-frontend) · HTML · CSS · JavaScript · DOM
Build the shop's storefront with semantic HTML, responsive CSS (Flexbox + Grid),
core JavaScript, and a live, interactive product catalog + cart using the DOM.

### [Module 02 — Backend API](./modules/02-backend-api) · Node.js · Express
Serve data over HTTP: a raw Node server, a full Express CRUD API, a clean layered
architecture (routes → controllers → services) with cart & orders, and JWT auth.

### [Module 03 — Database](./modules/03-database) · PostgreSQL · Prisma
Model the shop in a relational database: SQL fundamentals, a full schema with joins
and a dashboard, then Prisma ORM with a transactional, atomic-stock checkout.

### [Module 04 — Frontend Framework](./modules/04-frontend-framework) · React · Next.js
Rebuild the storefront as a modern SPA with React, master **state management**
(useState, useReducer, Context), server-render with Next.js, and wire up a full
authenticated checkout against your API.

### [Final Project](./final-project) — SooqOnline
The complete reference solution: a Next.js + Tailwind frontend talking to an
Express + Prisma + PostgreSQL + JWT backend, connected to a **real** database.

---

## Prerequisites

- [Node.js](https://nodejs.org) 18+ and npm
- [PostgreSQL](https://www.postgresql.org/download/) (local) **or** a hosted
  Postgres URL (Railway, Supabase, Neon…)
- A code editor (VS Code recommended) and a REST client (Thunder Client / Postman)
- Basic comfort with the command line and Git

## Configuration & secrets

Copy [`.env.example`](./.env.example) to `.env` and fill in your own values. The
`.env` file is git-ignored — **never commit real credentials**. The final-project
backend reads `DATABASE_URL` and `JWT_SECRET` from its own `.env`.

---

*Reference source: [`docs/sooqonline-lab-guide.md`](./docs/sooqonline-lab-guide.md)*

# SooqOnline — Final Project

The complete reference application the whole course builds toward: a full-stack
e-commerce site for Somaliland.

```
final-project/
├─ backend/     sooqonline-api   — Express + Prisma + PostgreSQL + JWT (port 3000)
└─ frontend/    sooqonline-next  — Next.js + Tailwind (port 3001)
```

## Run it locally (two terminals)

1. **Backend** — see [`backend/HOW-TO-RUN.md`](./backend/HOW-TO-RUN.md):
   set `.env` (DATABASE_URL + JWT_SECRET), `npm install`, `npx prisma migrate dev`,
   `node prisma/seed.js`, `npm run dev`.
2. **Frontend** — see [`frontend/HOW-TO-RUN.md`](./frontend/HOW-TO-RUN.md):
   `npm install`, `npm run dev`, open http://localhost:3001.

Admin login: `admin@sooqonline.local` / `admin1234`.

## Deployment

Both services deploy to Railway. See [`DEPLOY-RAILWAY.md`](./DEPLOY-RAILWAY.md) for
the step-by-step Railway CLI workflow (Postgres, backend, frontend, env vars, and
running the migration + seed against the hosted database).

## The full demo flow

browse → register → login → add to cart → checkout → order appears in **My Orders**
(stock decreases in the database) → admin manages products; the customer role is
blocked from admin routes by the server (`403`), not just the UI.

## Security

No credentials are committed. Each service has its own `.env.example` with
placeholders; real `.env` / `.env.local` files are git-ignored.

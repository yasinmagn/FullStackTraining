# SooqOnline API — Final Project Backend

Express + Prisma + PostgreSQL + JWT. This is the complete reference API the whole
course builds toward. It connects to a **real** PostgreSQL database via `DATABASE_URL`.

## Features

- **Products** — public browse/search/filter; admin-only create/update/delete.
- **Auth** — register + login, bcrypt password hashing, JWT (2h expiry).
- **Cart** — per-user server-side cart (authenticated).
- **Orders** — checkout as a Prisma `$transaction` with an **atomic
  check-and-decrement** on stock (no overselling under concurrent buyers).

## Architecture (layered)

```
src/
  server.js            app wiring + middleware + route mounting
  db.js                single PrismaClient instance
  middleware/auth.js   requireAuth (JWT) + requireAdmin (role)
  routes/              HTTP verbs → controller methods
  controllers/         parse req / shape res / map errors → status codes
  services/            business logic + Prisma queries
prisma/
  schema.prisma        data model
  seed.js              categories, 20 products, admin user
```

## Run

See [`HOW-TO-RUN.md`](./HOW-TO-RUN.md). In short:

```bash
cp .env.example .env      # set DATABASE_URL and a long JWT_SECRET
npm install
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev               # http://localhost:3000
```

Admin login: `admin@sooqonline.local` / `admin1234`.

## API reference

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/products` | public | `?search=`, `?category=`, `?maxPrice=` |
| GET | `/products/:id` | public | |
| POST | `/products` | admin | create |
| PUT | `/products/:id` | admin | update |
| DELETE | `/products/:id` | admin | delete |
| POST | `/auth/register` | public | `{ name, email, password }` |
| POST | `/auth/login` | public | returns `{ token }` |
| GET | `/cart` | user | current user's cart |
| POST | `/cart/items` | user | `{ productId, quantity }` |
| PUT | `/cart/items/:productId` | user | `{ quantity }` (0 removes) |
| DELETE | `/cart/items/:productId` | user | |
| POST | `/orders` | user | checkout (`{ items }` or server cart) |
| GET | `/orders` | user | my orders |
| GET | `/orders/:id` | user | one of my orders |

## Security

`.env` is git-ignored — **never commit real credentials**. Only `.env.example`
(placeholders) is committed.

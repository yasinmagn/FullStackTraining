# Module 02 — Backend API

**Node.js · Express · REST · Auth (JWT)**

In this module you turn the static SooqOnline storefront into a real backend API.
You begin with a bare Node HTTP server that hand-rolls routing, then adopt Express
to build a clean CRUD API for products. From there you refactor into a layered
architecture (routes → controllers → services) and add a shopping cart and order
checkout with in-memory state. Finally you make it secure: password hashing with
bcrypt, stateless auth with JSON Web Tokens, and role-based route protection.

All data in this module lives **in memory** (plain arrays and objects). The
database phase comes later — here the focus is HTTP, routing, layering, and auth.

## Learning objectives

By the end of this module you will be able to:

- Serve JSON over HTTP with the raw Node `http` module and manual routing.
- Build a RESTful CRUD API with Express: routing, middleware, validation, status codes.
- Structure a codebase into routes, controllers, and services with clear responsibilities.
- Model a cart and order-checkout flow with stock checks and derived totals.
- Secure an API with bcrypt password hashing, JWT auth, and `requireAuth` / `requireAdmin` middleware.

## Units

| # | Unit | You will build |
|---|------|----------------|
| 1 | [Raw Node HTTP Server](./01-raw-node-http) | A JSON server with hand-written routing |
| 2 | [Express CRUD](./02-express-crud) | Full products CRUD API with middleware + validation |
| 3 | [Layered Cart & Orders](./03-layered-cart-orders) | routes/controllers/services + cart + checkout |
| 4 | [Auth & JWT](./04-auth-jwt) *(Milestone 2)* | bcrypt + JWT login and protected routes |

## How each unit works

Each unit folder has:
- `README.md` — the lesson (objectives, tasks, verify checklist).
- `starter/` — copy this and complete the numbered TODOs.
- `solution/` — the complete reference once you're done (or stuck).

Work through the units in order — each starter builds on the previous solution.

## Running any unit

```bash
cd <unit>/starter      # or solution
npm install            # units 2–4 (unit 1 has no dependencies)
npm run dev            # starts on http://localhost:3000 with --watch
```

Units 3 and 4 read configuration from a `.env` file. Each of those units ships a
`.env.example` — copy it to `.env` and fill in the values before running:

```bash
cp .env.example .env
```

Never commit a real `.env`; it is for your machine only.

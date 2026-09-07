# Unit 2 — Express CRUD

## Introduction

Hand-writing routing gets tedious fast. Express is the standard Node web framework:
it gives you clean route definitions, middleware, and helpers like `res.json`. In
this unit you convert the raw server into an Express app and build a full CRUD API
for products — Create, Read, Update, Delete — with input validation, correct HTTP
status codes, and a logging middleware.

The starter is the Lab 5 server converted to Express. The two `GET` routes are done
for you as a reference; you complete the write operations.

## Learning objectives

- Build an Express app with `express.json()` and `cors` middleware.
- Write custom middleware that runs on every request and calls `next()`.
- Implement `POST` / `PUT` / `DELETE` routes with validation.
- Return the right status codes: `201` created, `204` no content, `400` bad request, `404` not found.

## Session brief

The starter is the previous unit's solution, converted to Express (the `GET` routes
are already written as a reference). Run `npm install`, then `npm run dev`. Complete
the TODOs in `server.js`: the logger middleware plus the `POST` / `PUT` / `DELETE`
routes with validation and a fallback route.

## Tasks

1. Write a **logger middleware** that prints `"METHOD URL"` for every request, then
   calls `next()`.
2. `POST /products` — validate that `name` is present and `price` is a positive
   number (else `400` with a clear error). On success push
   `{ id: nextId++, ...fields }` and respond `201` with the created product.
3. `PUT /products/:id` — `404` if not found, else merge the request body fields with
   `Object.assign` and return the updated product.
4. `DELETE /products/:id` — `404` if not found, else remove it and respond `204`.
5. A **fallback route** (must be last) — `404` with `{ error: "Route not found" }`.

**Stretch:** `GET /products/stats` returning `{ count, totalStockValue, outOfStock }`.

## Verify

Test in Thunder Client (or any REST client):

- All 5 endpoints work (`GET` list, `GET` one, `POST`, `PUT`, `DELETE`).
- `POST` with a missing `name` returns `400`.
- Any operation on an unknown id returns `404`.
- A successful `POST` returns `201` with the created product.
- A successful `DELETE` returns `204` with no body.

## Solution walkthrough

See [`solution/`](./solution). The logger middleware is registered with `app.use`
before the routes so it runs first. Validation lives at the top of the `POST`
handler and returns early with `400`. `PUT` uses `Object.assign(product, req.body)`
to merge only the supplied fields. `DELETE` uses `findIndex` + `splice` and ends
with `res.status(204).end()`. The fallback `app.use` is registered **last** so it
only fires when no route matched.

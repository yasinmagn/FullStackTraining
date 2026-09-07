# Unit 1 — Raw Node HTTP Server

## Introduction

Before reaching for a framework, it helps to see what a web server actually is: a
program that listens for HTTP requests and writes back responses. In this unit you
build the very first version of the SooqOnline API using only Node's built-in
`http` module — no Express, no dependencies. You write the routing by hand so you
understand exactly what Express will do for you later.

This project (`sooqonline-api`) is the backend you will grow across the rest of the
module.

## Learning objectives

- Create an HTTP server with the built-in `http` module.
- Inspect `req.method` and `req.url` to route requests manually.
- Write JSON responses with the correct status code and `Content-Type` header.
- Return a proper `404` for unknown routes.

## Session brief

This is a new project — it becomes `sooqonline-api`. There are no dependencies to
install. Run `npm run dev`, then open <http://localhost:3000/products>. Complete the
TODOs in `server.js` and `data/products.js`.

## Tasks

1. In `data/products.js`, replace the sample products with **your own 10 products**
   from the frontend module (keep the `{ id, name, price, stock, category }` shape).
2. In `server.js`, handle `GET /products` — respond `200` with the products array as
   JSON and `Content-Type: application/json`.
3. Handle `GET /` — respond `200` with `{ message: "Welcome to SooqOnline API" }`.
4. Handle anything else — respond `404` with `{ error: "Not found" }`.

**Stretch (homework):** add `GET /categories` that returns the unique category
names (hint: `map` + `Set`).

## Verify

- `GET /products` returns your JSON array.
- `GET /` returns the welcome JSON.
- Any other path (e.g. `/nope`) returns `404` with `{ error: "Not found" }`.
- Every response has `Content-Type: application/json`.

## Solution walkthrough

See [`solution/`](./solution). The server reads `req.url` and `req.method`, writes
the status code and JSON `Content-Type` header with `res.writeHead`, and serializes
the body with `JSON.stringify`. The final `else` branch is the catch-all `404`. The
stretch `GET /categories` route derives unique categories with
`[...new Set(products.map(p => p.category))]`.

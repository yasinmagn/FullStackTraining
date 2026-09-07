# Unit 3 — Layered Structure, Cart & Orders

## Introduction

A single `server.js` gets unmanageable as an API grows. Real backends split
responsibilities into layers: **routes** describe the URLs, **controllers** translate
HTTP to and from plain function calls, and **services** hold the business logic and
data. In this unit you refactor into that shape (the products layer is done for you
as the pattern) and then build two new features: a shopping **cart** and order
**checkout**.

There is no real login yet, so auth is faked: every request carries an `x-user-id`
header and the server treats that as the current user. You replace this with real
JWT auth in the next unit.

## Learning objectives

- Organize an Express app into routes, controllers, and services.
- Load configuration from a `.env` file with `dotenv`.
- Model per-user carts with add / update-quantity / remove operations and stock checks.
- Implement an order checkout that validates stock, decrements it atomically-ish, and computes a total.

## Session brief

The starter is the previous unit's solution, refactored into
`routes/`, `controllers/`, and `services/` (the products layer is complete as the
pattern to copy). Run `npm install`, then copy `.env.example` to `.env`, then
`npm run dev`. Build the cart and orders layers by following the products pattern.
For now, auth is faked by reading the user id from the `x-user-id` header.

## Tasks

1. In `server.js`, mount `./routes/cart` at `/cart` and `./routes/orders` at
   `/orders`. Build `routes/cart.js` and `routes/orders.js` following
   `routes/products.js`, plus the matching controllers.
   - Cart: `GET /` (my cart), `POST /items` (`{ productId, quantity }`),
     `PUT /items/:productId` (set quantity), `DELETE /items/:productId` (remove).
   - Orders: `POST /` (checkout), `GET /` (my orders), `GET /:id` (one of mine).
2. `services/cart.js` → `getCart(userId)` returns the user's items array (empty array if none).
3. `addItem(userId, productId, quantity)`:
   - product must exist → else throw `Error("PRODUCT_NOT_FOUND")`
   - `product.stock >= quantity` → else throw `Error("INSUFFICIENT_STOCK")`
   - if the item already exists, increase its quantity; else push a new item. Return the cart.
4. `setQuantity(userId, productId, quantity)` — a quantity of `0` removes the item.
5. `clear(userId)`.
6. `services/orders.js` → `checkout(userId)`:
   - cart empty → throw `Error("CART_EMPTY")`
   - build items `{ productId, name, unitPrice: current price, quantity }`, re-checking
     stock for each (throw `INSUFFICIENT_STOCK` if not enough)
   - decrement stock only **after** all checks pass
   - create `{ id, userId, items, total, createdAt, status: "pending" }`, push it,
     clear the cart, and return the order.
7. `listByUser(userId)` and `getById(userId, orderId)` (return `null` if the order
   is not this user's).

## Verify

Test the flow in Thunder Client (send an `x-user-id` header, e.g. `1`):

- `POST /cart/items` twice → items appear in `GET /cart`.
- `PUT /cart/items/:productId` changes the quantity.
- `POST /orders` creates an order; `GET /orders` shows it, and the products' stock has decreased.
- Checking out an **empty** cart returns `400`.

## Solution walkthrough

See [`solution/`](./solution). Controllers are thin: they read `req.userId` / params
/ body, call a service, and map thrown errors to status codes (`PRODUCT_NOT_FOUND` →
404, `INSUFFICIENT_STOCK` → 409, `CART_EMPTY` → 400). `checkout` does all stock
checks first and only mutates stock once every line passes, so a failure leaves
inventory untouched. `total` is computed with `reduce` over `unitPrice * quantity`.
`getById` returns `null` when the order's `userId` doesn't match, which the
controller turns into a `404`.

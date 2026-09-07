# Unit 3 — Prisma + Postgres (Milestone 3)

## Introduction

Hand-written SQL taught you how the database thinks. Now you swap it for **Prisma**:
one schema file that generates a typed client, runs migrations, and lets you query in
JavaScript without string-building SQL. You'll define the full data model, migrate it
into Postgres, seed it with a script, and — the part that matters most — make checkout
an **atomic transaction** that cannot oversell your stock, even under a race.

## Learning objectives

- Define a Prisma schema: models, fields, relations, `@unique`, `@default`, `@db.Decimal`.
- Run a migration (`prisma migrate dev`) and seed data with a Node script.
- Understand the atomic check-and-decrement pattern for safe checkout.
- Wrap multi-step writes in `prisma.$transaction` so they all-or-nothing.

## Session brief

Starter = your Lab 8 API + this Prisma scaffold. Copy `prisma/` and these notes into
your API repo. Setup:

```bash
npm install prisma @prisma/client bcryptjs
cp .env.example .env          # then set a real DATABASE_URL in .env (never commit it)
npx prisma migrate dev --name init
node prisma/seed.js
```

Complete the `schema.prisma` TODOs and the `seed.js` TODO, then port your services to
Prisma (products first, then everywhere) and make checkout a transaction.

## Tasks

1. **`schema.prisma` TODO 1** — `model User`: `id`, `name`, `email @unique`,
   `passwordHash`, `role` (default `"customer"`), `createdAt`; relations
   `orders Order[]`, `cartItems CartItem[]`.
2. **`schema.prisma` TODO 2** — `model CartItem`: `id`, user relation, product relation,
   `quantity`; add `@@unique([userId, productId])` (max one row per user per product).
3. **`schema.prisma` TODO 3** — `model Order`: `id`, user relation, `status`
   (default `"pending"`), `total Decimal @db.Decimal(10,2)`, `items OrderItem[]`,
   `createdAt`.
4. **`schema.prisma` TODO 4** — finish `model OrderItem`: order relation
   (`onDelete: Cascade`), product relation, `quantity Int`,
   `unitPrice Decimal @db.Decimal(10, 2)`.
5. **`seed.js` TODO 5** — seed your 20 products (look up category ids first with
   `findUnique`).
6. Port checkout to a transaction — see `checkout-transaction-reference.js`.

## Verify

- A server restart keeps your data (it's in Postgres now, not memory).
- Stock = 1 and a checkout for quantity 2 returns a clean **400** and stock is
  unchanged (the atomic update matched 0 rows).
- `npx prisma studio` shows your orders and items.

## The atomic check-and-decrement pattern

The naive checkout is *read stock → compare in JS → write new stock*. Between the read
and the write, another request can slip in and buy the same unit — now you've sold
stock you don't have. The fix is to make the **check and the decrement one indivisible
step** and let the database enforce it:

```js
const updated = await tx.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },  // only if enough stock
  data:  { stock: { decrement: quantity } },           // subtract in the same statement
});
if (updated.count === 0) throw new Error("INSUFFICIENT_STOCK");
```

`updateMany` with `stock: { gte: quantity }` in the `WHERE` means the row is only
touched **if** it still has enough stock, and the decrement happens in the same SQL
`UPDATE`. There is no window between checking and updating. If `updated.count === 0`,
either the product vanished or someone else bought it first — either way you abort.
Wrapping the whole loop in `prisma.$transaction` makes every decrement and the order
creation **all-or-nothing**: if any item fails, every earlier decrement rolls back, so
you never charge for a half-fulfilled cart. See
[`solution/checkout-transaction-reference.js`](./solution/checkout-transaction-reference.js).

## Solution walkthrough

See [`solution/prisma/schema.prisma`](./solution/prisma/schema.prisma) for the complete
model, [`solution/prisma/seed.js`](./solution/prisma/seed.js) for the full seed
(categories, admin user, ~20 products), and the transaction reference above. Note
`@db.Decimal(10, 2)` for money (never float — floats lose cents), `@@unique` for the
cart's one-row-per-product rule, and `onDelete: Cascade` on `OrderItem` so deleting an
order clears its items — the same CASCADE you wrote by hand in Unit 2.

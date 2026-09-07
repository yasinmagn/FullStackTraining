# Unit 2 — Schema, Joins & Dashboard

## Introduction

A shop is more than a product list — it has customers who place orders, and orders
made of line items. In this unit you complete the relational schema (`orders` and
`order_items`), wire the foreign keys by hand, and seed real orders. Then you write
the joins that turn scattered rows into answers a shop owner actually asks:
best sellers, revenue, spending per customer. This is where relationships "click".

## Learning objectives

- Model one-to-many relationships with foreign keys.
- Protect data with `CHECK` (valid statuses, positive quantities) and clean up with
  `ON DELETE CASCADE`.
- Seed related rows by hand and reason about the foreign keys you're writing.
- Write multi-table `JOIN`s, aggregate with `GROUP BY`, and filter groups with `HAVING`.

## Session brief

Starter = the Lab 9 solution (`schema.sql` already includes the solved `users` table).
Draw the full schema on paper **first** — get instructor sign-off — then complete the
TODOs. Run `psql -d sooqonline -f schema.sql`, then work through `dashboard.sql`.

## Tasks

1. **`schema.sql` TODO 1** — create `orders`: `id` serial PK; `user_id` int not null
   references `users(id)`; `status` text not null default `'pending'` with
   `CHECK (status IN ('pending','paid','shipped','delivered','cancelled'))`;
   `total` numeric(10,2) not null default 0; `created_at` timestamptz default `now()`.
2. **`schema.sql` TODO 2** — create `order_items`: `id` serial PK; `order_id` int not
   null references `orders(id)` **ON DELETE CASCADE**; `product_id` int not null
   references `products(id)`; `quantity` int not null `CHECK (quantity > 0)`;
   `unit_price` numeric(10,2) not null.
3. **`schema.sql` TODO 3** — seed 3 users, then 5 orders with 2–4 order_items each.
4. **`dashboard.sql` TODO 4** — top 5 best-selling products (name, total units sold).
5. **`dashboard.sql` TODO 5** — total revenue of all non-cancelled orders.
6. **`dashboard.sql` TODO 6** — revenue per category (category name, revenue) — 3 joins!
7. **`dashboard.sql` TODO 7** — each customer's total spending, highest first.
8. **`dashboard.sql` TODO 8** — orders containing more than 2 items (`GROUP BY` + `HAVING`).

## Verify

- 5 seeded orders with items exist.
- Every dashboard query returns real numbers (no empty results).
- Deleting an order also deletes its items:
  `DELETE FROM orders WHERE id = 1;` then
  `SELECT count(*) FROM order_items WHERE order_id = 1;` → `0` (CASCADE worked).

## Solution walkthrough

See [`solution/schema.sql`](./solution/schema.sql) and
[`solution/dashboard.sql`](./solution/dashboard.sql). The `order_items` table is a
*join table with data* — it links orders to products and also stores `quantity` and
`unit_price` (a snapshot of the price at purchase time, so later price changes don't
rewrite history). `ON DELETE CASCADE` means removing an order automatically removes
its line items — no orphans. In the dashboard, revenue is always
`quantity * unit_price` summed with `SUM()`; the 3-join revenue-per-category query
walks `order_items → products → categories`; and `HAVING SUM(quantity) > 2` filters
*after* grouping, which is the difference between `WHERE` (per row) and `HAVING`
(per group).

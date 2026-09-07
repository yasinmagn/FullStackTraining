# Unit 1 — SQL Basics

## Introduction

Every app you've built so far kept its data in memory or a JSON file — it vanished on
restart. Now the data gets a permanent home. In this unit you create a PostgreSQL
database for SooqOnline, define the `categories`, `products`, and `users` tables with
real constraints, seed 20 products, and write the queries a shop needs every day.
You'll also *break things on purpose* — because a constraint that rejects bad data is
doing its job.

## Learning objectives

- Create a database and tables with `CREATE DATABASE` / `CREATE TABLE`.
- Choose column types (`SERIAL`, `TEXT`, `NUMERIC`, `INTEGER`, `TIMESTAMPTZ`).
- Enforce data integrity with `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`, and `REFERENCES`.
- Query with `SELECT`, `WHERE`, `ORDER BY`, `LIMIT`, `GROUP BY`, and `ILIKE`.
- Read and understand Postgres error messages when a constraint fires.

## Session brief

Run `psql -U postgres -f setup.sql`, then work through `queries.sql`
(`psql -d sooqonline`). Complete the TODOs in `setup.sql` (the `users` table and the
12 extra products) and in `queries.sql`.

## Tasks

1. **`setup.sql` TODO 1** — create the `users` table: `id` serial PK, `name` text not
   null, `email` text not null **UNIQUE**, `password_hash` text not null, `role` text
   not null default `'customer'`, `created_at` timestamptz default `now()`.
2. **`setup.sql` TODO 2** — insert 12 more products (total 20) across the categories.
3. **`queries.sql` TODO 3** — the 5 cheapest products (name, price).
4. **`queries.sql` TODO 4** — all out-of-stock products.
5. **`queries.sql` TODO 5** — products between $10 and $100, sorted by price ascending.
6. **`queries.sql` TODO 6** — count of products per `category_id` (`GROUP BY`).
7. **`queries.sql` TODO 7** — case-insensitive search for `'phone'` in the name (`ILIKE`).
8. **`queries.sql` TODO 8** — break things on purpose, and paste each ERROR message as
   a comment: (a) price `-5`, (b) `category_id` 999, (c) two users with the same email.

## Verify

- 20 products inserted (`SELECT count(*) FROM products;` → 20).
- Each query returns sensible results.
- The constraint-breaking inserts **FAIL** — that is success. You should see errors
  like `violates check constraint`, `violates foreign key constraint`, and
  `duplicate key value violates unique constraint`.

## Solution walkthrough

See [`solution/setup.sql`](./solution/setup.sql) and
[`solution/queries.sql`](./solution/queries.sql). The `users` table's `UNIQUE` on
`email` is what makes duplicate signups impossible at the database level — never trust
the app layer alone. In the queries, `LIMIT 5` after `ORDER BY price` gives the
cheapest five, `GROUP BY category_id` collapses rows into per-category counts, and
`ILIKE '%phone%'` is a case-insensitive `LIKE`. The "break things" section proves your
`CHECK (price > 0)`, the `REFERENCES categories(id)` foreign key, and the `UNIQUE`
email constraint are all live.

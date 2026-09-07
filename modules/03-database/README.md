# Module 03 — Database

**PostgreSQL · SQL · Prisma**

In this module you give SooqOnline a real database. You start in raw SQL — creating
tables, seeding products, and querying them — then design the full relational schema
(users, orders, order items) and write the joins that power a shop-owner dashboard.
Finally you replace hand-written SQL with Prisma: a typed schema, migrations, a seed
script, and an atomic checkout transaction that can't oversell your stock.

## Learning objectives

By the end of this module you will be able to:

- Create tables with the right column types, constraints (`NOT NULL`, `UNIQUE`, `CHECK`, `REFERENCES`) and understand why each one protects your data.
- Query with `WHERE`, `ORDER BY`, `GROUP BY`, `HAVING`, `ILIKE`, and multi-table `JOIN`s.
- Model relationships (one-to-many, cascade delete) and seed realistic data by hand.
- Define a Prisma schema, run migrations, seed with a script, and make checkout a safe transaction.

## Units

| # | Unit | You will build |
|---|------|----------------|
| 1 | [SQL Basics](./01-sql-basics) | `setup.sql` (categories/products/users) + `queries.sql` |
| 2 | [Schema, Joins & Dashboard](./02-schema-joins-dashboard) | Full schema (orders/order_items) + `dashboard.sql` joins |
| 3 | [Prisma + Postgres](./03-prisma-postgres) *(Milestone 3)* | Prisma schema, migrations, seed, atomic checkout |

## How each unit works

Each unit folder has:
- `README.md` — the lesson (objectives, tasks, verify checklist).
- `starter/` — copy this and complete the numbered TODOs.
- `solution/` — the complete reference once you're done (or stuck).

Work through the units in order — each starter builds on the previous solution.

## Prerequisites

- PostgreSQL 14+ installed and the `psql` client on your PATH.
- Node.js 18+ (for Unit 3 / Prisma).
- Never commit a real `.env`. Every unit ships a `.env.example` with placeholders only.

# Backend Stage 5 — Data Access & Migrations

> **Goal:** evolve a schema you cannot drop, and write a data-access layer that
> is safe under concurrency — then swap it in behind the interface Stage 3
> defined, without touching a line of the service.

| | |
|---|---|
| **Time** | ~3 hours |
| **Prerequisites** | [Stage 3](../stage-3-rest-api-design/LESSON.md), [Stage 4](../stage-4-sql-postgres/LESSON.md) |
| **You will build** | A migration runner with locking and checksums, a PostgreSQL repository, and **24 integration tests against a real database** |

---

## 1. Run it

Set `DATABASE_URL` and `TEST_DATABASE_URL` in `.env` (see
[Stage 4 §1](../stage-4-sql-postgres/LESSON.md#1-set-up-the-database)), then:

```bash
npm run migrate:status --workspace backend-stage-5-data-access-migrations
npm run migrate        --workspace backend-stage-5-data-access-migrations
npm run demo           --workspace backend-stage-5-data-access-migrations
npm test               --workspace backend-stage-5-data-access-migrations
```

```
  id   status    name
  ---- --------- ----------------------------------------
  001  applied   create_tasks
  002  applied   add_task_indexes
  003  applied   add_updated_at_trigger
```

> **The test suite requires `TEST_DATABASE_URL` and deliberately does not fall
> back to `DATABASE_URL`.** See §7. Without it, the tests **skip** rather than
> fail.

---

## 2. Why migrations

Stage 4 could open with `DROP SCHEMA ... CASCADE`. You cannot drop a production
database, so schema changes have to be applied **incrementally, in order,
exactly once, on every environment** — your laptop, your colleague's laptop,
CI, staging, production.

That is all a migration tool is. `src/db/migrator.ts` is about 150 lines and
rests on four ideas. Real tools (node-pg-migrate, Flyway, Prisma Migrate, Knex)
add more, but every one is built on these — and knowing them means you can debug
the tool when it wedges, which it eventually will.

### Idea 1 — The database remembers

```sql
CREATE TABLE schema_migrations (
  id text PRIMARY KEY, name text NOT NULL,
  checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
);
```

A table **in the database itself** is the only source of truth that survives a
new laptop, a new environment, and a new team member.

### Idea 2 — Only one process may migrate at a time

```ts
await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
```

Deploy four containers at once and all four start migrating simultaneously.
Without a lock they race: duplicate `CREATE TABLE`, half-applied changes, a
deployment that fails in a way nobody can reproduce.

A PostgreSQL **advisory lock** is ideal: a named lock the database holds for
you, costing nothing, released automatically if the process dies — so a crashed
deploy cannot wedge the next one.

### Idea 3 — Applied migrations are immutable

```
Migration 002_add_task_indexes has been modified since it was applied.
  applied checksum: 3f9a2c...
  current checksum: 8e1b04...
An applied migration is immutable. Write a NEW migration instead.
```

Editing a migration that has already run is one of the most damaging things you
can do to a team: your database has the old version, the next person's has the
new one, and nothing tells you until something breaks in a way that makes no
sense. The checksum catches it on the spot.

> **The rule: never edit an applied migration. Write a new one.**

### Idea 4 — Each migration is its own transaction

PostgreSQL supports **transactional DDL** — `CREATE TABLE`, `ALTER TABLE` and
friends can be rolled back. (MySQL cannot, which is why migrations there are so
much more dangerous.)

So a migration that fails halfway leaves the schema exactly as it was, and the
`schema_migrations` row rolls back with it.

### On `down` migrations

Useful in development. In production, prefer rolling **forward** with a new
migration: a `down` that drops a column destroys data, and the deploy you are
rolling back has usually already written some.

### Writing a safe migration

| Change | Safe? | Why |
|---|---|---|
| `ADD COLUMN` nullable | ✅ | Instant, no rewrite |
| `ADD COLUMN` with a default | ✅ *(PG 11+)* | No longer rewrites the table |
| `ADD COLUMN NOT NULL` with no default | ❌ | Fails if any row exists |
| `DROP COLUMN` | ⚠️ | Deploy the code that stopped using it **first** |
| `CREATE INDEX` | ⚠️ | Locks writes. Use `CREATE INDEX CONCURRENTLY` |
| Rename a column | ❌ | Breaks running old code. Add-migrate-drop, over three deploys |

The general rule for zero-downtime: **old code and new code must both work
against the intermediate schema**, because during a deploy both are running.

---

## 3. The repository, now in PostgreSQL

`createPostgresTaskRepository` implements **the same interface** Stage 3 defined
against an in-memory array. The service does not change by one line.

That is the payoff of programming against an interface, and it is worth
pausing on: everything above this file is still unaware a database exists.

---

## 4. Parameterised queries

```ts
// ✗ Input `'; DROP TABLE tasks; --` and it is not your database any more.
`WHERE title = '${query.q}'`

// ✓
`WHERE title ILIKE $1`, [`%${query.q}%`]
```

The value **never becomes part of the SQL text**. The server parses the query
first and binds values afterwards, so there is no parse step left for the input
to escape into.

This is not escaping. It is a different mechanism, which is why it cannot be got
subtly wrong. There is a test that fires `'; DROP TABLE tasks; --` through the
search parameter and then asserts the table is still there.

### The one place you must build SQL by hand

Column names **cannot** be parameterised — `ORDER BY $1` sorts by a constant
string, not by that column. So sorting is the one place injection can creep in.
The defence is a lookup table:

```ts
const SORT_COLUMNS = {
  createdAt: 'created_at',
  dueDate: 'due_date',
  title: 'lower(title)',
  priority: `CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`,
} as const satisfies Record<ListTasksQuery['sort'], string>;
```

The client's string never reaches the SQL; it only selects a key here, and zod's
enum already guaranteed it is one of four values.

> Note the `priority` entry. As text, `'high' < 'low' < 'medium'`. The `CASE`
> sorts by what priority **means**.

---

## 5. Translating database errors

```ts
if (code === '23505') throw new ConflictError('A task with that title already exists');
```

**Why both a service check and a database constraint?** They are not redundant:

- The service check produces a good error message on the common path.
- The database constraint is the one that **actually holds under concurrency**.
  Two simultaneous requests can both pass the service check — only one can pass
  the unique index.

So the `23505` has to become a proper 409 rather than a 500. Branch on `code`,
never on the message.

---

## 6. Details that bite

### One query for the page *and* the total

```sql
SELECT *, count(*) OVER () AS total
FROM tasks WHERE ... ORDER BY ... LIMIT $1 OFFSET $2
```

The obvious alternative — a separate `COUNT` query — doubles the round trips
*and* can disagree with itself if a row is inserted between them.

With zero rows the window function has nothing to attach a count to, hence
`rows[0]?.total ?? 0`. There is a test for it.

### A malformed UUID is a 500 waiting to happen

```ts
if (!isUuid(id)) return null;
```

Passing `'not-a-uuid'` to PostgreSQL raises `22P02`
(`invalid_text_representation`), which surfaces as a 500. To a client, "not a
valid id" and "no such id" are the same thing — return `null` and let the
service produce its 404.

### `DATE` columns and time zones

```ts
dueDate: row.due_date === null ? null : formatDate(row.due_date)
```

`pg` returns a `DATE` as a JavaScript `Date` at **local midnight**. Calling
`.toISOString()` on it shifts the day backwards for anyone west of UTC — so a
task due on the 1st displays as due on the 28th. Build the calendar date from
the local components instead.

### `rowCount` distinguishes "deleted" from "nothing matched"

```ts
return (result.rowCount ?? 0) > 0;
```

Which is what lets the service return 404 rather than a cheerful 204.

### Let the trigger own `updated_at`

Nothing in the `UPDATE` statement sets `updated_at`; migration 003 does. Which
means a manual `UPDATE` from psql gets it right too.

---

## 7. Transactions

```ts
await withTransaction(pool, async (client) => {
  await repository.create(taskA, client);
  await repository.create(taskB, client);
});
```

Every repository method takes an **optional** `db`. Called without it, the query
auto-commits through the pool; called with a transaction client, it joins that
transaction. One method serves both, instead of `create` and
`createInTransaction` sitting side by side and slowly diverging.

### The three rules in `withTransaction`

Each is a production incident if you get it wrong:

1. **`pool.connect()`, not `pool.query()`.** A transaction is state on *one*
   connection. Issuing `BEGIN` and `COMMIT` through the pool can put them on
   different connections. It looks fine in development, where the pool has one
   idle client, and corrupts data under load.

2. **`ROLLBACK` in a `catch` that re-throws.** Swallowing the error would report
   success for work that was just discarded. Note that a failing rollback is
   logged but does not replace the original error — that one explains what
   actually went wrong.

3. **`release()` in `finally`.** A client that is never released is gone from
   the pool forever. Leak `max` of them and the app stops responding **with no
   error at all** — every request just waits for a connection that never comes
   back.

There is a test for rule 3 specifically. Note how it would present without the
fix: the suite would **hang**, not fail — which is exactly how the bug appears
in production.

---

## 8. Integration tests, and one safety decision

These tests **do not mock `pg`**. A mocked database proves your mock matches
your expectations, which was never in doubt. It cannot tell you that a
constraint fires, that a UUID cast fails, that your `ORDER BY` is valid SQL, or
that a unique index is case-insensitive — and those are the bugs.

### The suite requires `TEST_DATABASE_URL` and will not fall back

```ts
const connectionString = process.env.TEST_DATABASE_URL;   // no ?? DATABASE_URL
```

`beforeEach` runs `TRUNCATE tasks`. If this suite fell back to `DATABASE_URL`,
running `npm test` on a machine configured for development would **wipe the
developer's real data** — and on a machine configured against production,
worse.

**A destructive test suite must name its target explicitly. There is no safe
default.** If `TEST_DATABASE_URL` is unset the suite skips, so `npm test` at the
repo root stays green for someone who has not set a test database up yet.

```bash
createdb fullstack_training_test
# .env
TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fullstack_training_test
```

### The other two patterns worth copying

- **Migrate the test database from scratch in `beforeAll`.** The tests run the
  *same* migrations as production, so a broken migration fails here rather than
  during a deploy.
- **`TRUNCATE ... RESTART IDENTITY CASCADE` in `beforeEach`.** Far faster than
  `DELETE`, and every test starts from a known empty state. Tests that depend on
  data left by an earlier test pass in one order and fail in another — that is
  the definition of a flaky suite.

---

## 9. Exercises

### Exercise 1 — A migration that adds a column
Add `tags text[]` in `004_add_tags.sql`, with a `down`. Run `migrate:status`,
`migrate`, `migrate:down`, `migrate`.

### Exercise 2 — Trip the checksum guard
Edit an already-applied migration and run `npm run migrate`. Read the error.
Then undo the edit and write a new migration instead.

### Exercise 3 — Optimistic locking
Add a `version integer NOT NULL DEFAULT 1` column. Make `update` do
`... WHERE id = $1 AND version = $2` and increment it, throwing a
`ConflictError` when `rowCount` is 0.
*This is how you stop two clients silently overwriting each other.*

### Exercise 4 — Cursor pagination
Add `list` support for `?after=<id>` using
`WHERE (created_at, id) < ($1, $2)`.
*The tuple comparison is what makes it correct when timestamps tie.*

### Exercise 5 — Prove the connection leak
Delete the `finally { client.release() }` from `withTransaction` and run the
tests. Watch the suite **hang** rather than fail.
*Then restore it. That hang is what a leaked connection looks like in
production.*

### Exercise 6 — Wire it into Stage 3's API
Copy Stage 3's `http/` and `service/` folders in, and point the composition root
at `createPostgresTaskRepository` instead of the in-memory one. **Nothing in the
service or HTTP layer should need to change.**
*That is the whole architecture paying off — and it is exactly what the final
project does.*

---

## 10. Checklist

- [ ] Why the database, not a file, records which migrations ran
- [ ] What an advisory lock prevents during a multi-container deploy
- [ ] Why an applied migration is immutable, and what a checksum catches
- [ ] Which schema changes are safe to deploy, and why renames are not
- [ ] Why parameterised queries are not escaping
- [ ] The one place you must build SQL by hand, and how to make it safe
- [ ] Why a service check *and* a database constraint are both needed
- [ ] Why a `DATE` column needs care with time zones
- [ ] The three rules of `withTransaction`, and how each fails
- [ ] Why a destructive test suite must never fall back to `DATABASE_URL`

---

## 11. Further reading

- [PostgreSQL — Advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
- [node-postgres — Pooling](https://node-postgres.com/features/pooling)
- [PostgreSQL — Error codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Strong Migrations](https://github.com/ankane/strong_migrations#checks) — a checklist of unsafe migrations (Rails, but the reasoning is universal)

**Next:** [Stage 6 — Auth & Security](../stage-6-auth-security/LESSON.md)

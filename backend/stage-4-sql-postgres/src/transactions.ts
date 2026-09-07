/**
 * Transactions, isolation and locking - demonstrated, not just described.
 *
 *   npm run transactions --workspace backend-stage-4-sql-postgres
 *
 * Every example here uses `pool.connect()` to take a DEDICATED client.
 *
 * That is not a detail. A transaction is state on ONE connection. Run
 * `pool.query('BEGIN')` and then `pool.query('UPDATE ...')` and the two may
 * land on DIFFERENT pooled connections - so you have an open transaction doing
 * nothing on one connection and an auto-committed write on another. It usually
 * appears to work in development, where the pool has one idle connection, and
 * corrupts data under load.
 */
import type { PoolClient } from 'pg';
import { closePool, explainConnectionError, pool } from './db.ts';

/**
 * The transaction helper you should copy into every project.
 *
 * The `finally` block is the important part: a client that is never released
 * is gone from the pool forever. Leak `max` of them and the app stops
 * responding entirely, with no error - just requests waiting for a connection
 * that will never come back. This is one of the most common Node/PostgreSQL
 * production outages there is.
 */
async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const line = (label: string) => console.log(`\n${'='.repeat(72)}\n${label}\n${'='.repeat(72)}`);

async function countTasks(): Promise<number> {
  const { rows } = await pool.query<{ count: number }>('SELECT count(*) AS count FROM stage4.tasks');
  return rows[0]!.count;
}

try {
  // --- 1. ATOMICITY -------------------------------------------------------
  line('1. Atomicity: all of it, or none of it');

  const before = await countTasks();
  console.log(`tasks before: ${before}`);

  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO stage4.tasks (project_id, title) VALUES ($1, $2)`,
        ['aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'This insert will be rolled back'],
      );

      console.log('  inserted a task inside the transaction...');

      // Violates tasks_completed_at_matches_status: status 'done' requires a
      // completed_at. The database refuses, and the INSERT above goes with it.
      await client.query(
        `INSERT INTO stage4.tasks (project_id, title, status) VALUES ($1, $2, 'done')`,
        ['aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'This one violates a CHECK constraint'],
      );
    });
  } catch (error) {
    console.log(`  second insert failed: ${(error as Error).message.split('\n')[0]}`);
  }

  console.log(`tasks after:  ${await countTasks()}  <- unchanged. Both inserts were rolled back.`);

  // --- 2. CONSTRAINTS ARE THE LAST LINE OF DEFENCE ------------------------
  line('2. The database enforces invariants application code forgets');

  const attempts: [string, string][] = [
    ['NOT NULL', `INSERT INTO stage4.tasks (project_id) VALUES ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa')`],
    ['FOREIGN KEY', `INSERT INTO stage4.tasks (project_id, title) VALUES ('99999999-9999-4999-8999-999999999999', 'Orphan')`],
    ['UNIQUE', `INSERT INTO stage4.users (email, display_name) VALUES ('ADA@example.com', 'Impostor')`],
    // 'Write the migration runner' is 'todo' with completed_at NULL, so
    // marking it done WITHOUT setting completed_at breaks the invariant.
    ['CHECK (cross-column)', `UPDATE stage4.tasks SET status = 'done' WHERE title = 'Write the migration runner'`],
  ];

  for (const [name, sql] of attempts) {
    try {
      await pool.query(sql);
      console.log(`  ${name.padEnd(22)} allowed (unexpected!)`);
    } catch (error) {
      // Every PostgreSQL error has a five-character SQLSTATE. Branch on THAT,
      // never on the message - see the table in the lesson.
      const code = (error as { code?: string }).code;
      console.log(`  ${name.padEnd(22)} rejected, SQLSTATE ${code}`);
    }
  }

  // --- 3. ROW LOCKING: SELECT ... FOR UPDATE ------------------------------
  line('3. The lost update, and how SELECT ... FOR UPDATE prevents it');

  console.log(`
  The bug, in application code:

      const task = await db.query('SELECT estimate_hours FROM tasks WHERE id = $1');
      const next = task.estimate_hours + 1;                       <-- in JavaScript
      await db.query('UPDATE tasks SET estimate_hours = $1 ...', [next]);

  Two requests read 6, both compute 7, both write 7. One increment is LOST,
  silently, with no error anywhere.

  Three fixes, in order of preference:

    a) Do the arithmetic IN SQL - one atomic statement, no lock needed:
         UPDATE tasks SET estimate_hours = estimate_hours + 1 WHERE id = $1

    b) SELECT ... FOR UPDATE - lock the row for the rest of the transaction.
       Needed when the new value cannot be expressed in one statement.

    c) Optimistic locking - add a version column and
         UPDATE ... WHERE id = $1 AND version = $2
       then check rowCount. Zero means someone else won; retry or 409.
  `);

  await withTransaction(async (client) => {
    // FOR UPDATE holds the row until COMMIT or ROLLBACK. A second transaction
    // reaching this line BLOCKS rather than reading a stale value.
    const { rows } = await client.query<{ id: string; estimate_hours: string | null }>(
      `SELECT id, estimate_hours FROM stage4.tasks WHERE title = 'Design the schema' FOR UPDATE`,
    );
    const task = rows[0]!;
    console.log(`  locked task, estimate_hours = ${task.estimate_hours}`);

    await client.query(`UPDATE stage4.tasks SET estimate_hours = estimate_hours + 1 WHERE id = $1`, [task.id]);
    console.log('  incremented in SQL, lock released at COMMIT');
  });

  const { rows: after } = await pool.query<{ estimate_hours: string }>(
    `SELECT estimate_hours FROM stage4.tasks WHERE title = 'Design the schema'`,
  );
  console.log(`  estimate_hours is now ${after[0]!.estimate_hours}`);

  // --- 4. ISOLATION LEVELS ------------------------------------------------
  line('4. Isolation levels');

  console.log(`
  PostgreSQL's DEFAULT is READ COMMITTED. Each STATEMENT sees a fresh snapshot,
  so two identical SELECTs inside one transaction can return different results.

  | Level            | Dirty read | Non-repeatable read | Phantom read |
  |------------------|------------|---------------------|--------------|
  | READ COMMITTED   | no         | POSSIBLE            | POSSIBLE     |  <- default
  | REPEATABLE READ  | no         | no                  | no*          |
  | SERIALIZABLE     | no         | no                  | no           |

  * PostgreSQL's REPEATABLE READ is stronger than the SQL standard requires and
    also prevents phantom reads.

  Stronger isolation is not free: REPEATABLE READ and SERIALIZABLE can fail
  with SQLSTATE 40001 (serialization_failure), and your application MUST be
  prepared to retry the whole transaction. Use the default until you have a
  specific reason not to.
  `);

  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const first = await client.query<{ count: number }>('SELECT count(*) AS count FROM stage4.tasks');

    // A committed write from OUTSIDE this transaction.
    await pool.query(
      `INSERT INTO stage4.tasks (project_id, title) VALUES ($1, $2)`,
      ['aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'Inserted by another connection'],
    );

    const second = await client.query<{ count: number }>('SELECT count(*) AS count FROM stage4.tasks');
    await client.query('COMMIT');

    console.log(`  inside REPEATABLE READ:  first count ${first.rows[0]!.count}, second count ${second.rows[0]!.count}`);
    console.log('  -> identical. The transaction sees one consistent snapshot.');
    console.log(`  outside the transaction: ${await countTasks()}`);
  } finally {
    client.release();
  }

  console.log('\nRe-run `npm run db:setup` to reset the data.\n');
} catch (error) {
  console.error('\nTransaction demo failed.');
  console.error(explainConnectionError(error));
  process.exitCode = 1;
} finally {
  await closePool();
}

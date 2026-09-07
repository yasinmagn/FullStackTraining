/**
 * Reading query plans, and watching an index actually earn its place.
 *
 *   npm run explain --workspace backend-stage-4-sql-postgres
 *
 * This script generates 50,000 rows in a temporary table, runs the same query
 * with and without an index, and prints both plans. Seven rows of seed data
 * would prove nothing: on a tiny table PostgreSQL correctly ignores your index
 * and does a sequential scan, which is a genuinely confusing first encounter
 * with EXPLAIN.
 */
import { closePool, explainConnectionError, pool } from './db.ts';

interface PlanRow {
  'QUERY PLAN': string;
}

async function explain(label: string, sql: string) {
  console.log(`\n${'-'.repeat(72)}\n${label}\n${'-'.repeat(72)}`);
  // ANALYZE actually RUNS the query and reports real timings, so never use it
  // on an INSERT/UPDATE/DELETE you do not want executed. BUFFERS shows how much
  // came from cache versus disk.
  const { rows } = await pool.query<PlanRow>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`);
  for (const row of rows) console.log('  ' + row['QUERY PLAN']);
}

try {
  console.log('Building a 50,000 row table (a few seconds)...');

  await pool.query('DROP TABLE IF EXISTS stage4.big_tasks');
  await pool.query(`
    CREATE TABLE stage4.big_tasks (
      id serial PRIMARY KEY,
      project_id int NOT NULL,
      status text NOT NULL,
      title text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  // generate_series is PostgreSQL's built-in row generator - the fastest way to
  // make realistic test data without a script.
  await pool.query(`
    INSERT INTO stage4.big_tasks (project_id, status, title)
    SELECT
      (i % 500) + 1,
      (ARRAY['todo', 'in_progress', 'done'])[1 + (i % 3)],
      'Task number ' || i
    FROM generate_series(1, 50000) AS i
  `);

  // ANALYZE updates the statistics the planner uses. Without fresh stats the
  // planner guesses from stale numbers and picks a bad plan - which is a real
  // production failure mode after a bulk load.
  await pool.query('ANALYZE stage4.big_tasks');

  const query = `
    SELECT id, title
    FROM stage4.big_tasks
    WHERE project_id = 42 AND status = 'todo'
    ORDER BY created_at DESC
    LIMIT 20
  `;

  await explain('WITHOUT an index - look for "Seq Scan"', query);

  console.log('\nCreating index on (project_id, status, created_at DESC)...');
  await pool.query(`
    CREATE INDEX big_tasks_project_status_created_idx
      ON stage4.big_tasks (project_id, status, created_at DESC)
  `);
  await pool.query('ANALYZE stage4.big_tasks');

  await explain('WITH the index - look for "Index Scan"', query);

  // The column-order lesson, made concrete.
  await explain(
    'The SAME index cannot help a query that filters only on status\n' +
      '(the index is ordered by project_id first - like a phone book by surname)',
    `SELECT count(*) FROM stage4.big_tasks WHERE status = 'todo'`,
  );

  console.log(`
${'='.repeat(72)}
How to read a plan
${'='.repeat(72)}
  Read it INSIDE OUT and BOTTOM UP - the most indented node runs first.

  Seq Scan          reads every row. Fine on a small table, a problem on a big
                    one when a WHERE clause should have narrowed it.
  Index Scan        walks the index, then fetches matching rows.
  Index Only Scan   the best case: the index alone answered the query.
  Bitmap Heap Scan  many matches - collect the row locations, then fetch them
                    in physical order. Usually a good sign, not a bad one.
  Nested Loop       for each row on the left, probe the right. Great for few
                    rows, disastrous for many.
  Hash Join         build a hash table from one side. The usual choice for
                    joining two large sets.

  rows=1000 (actual rows=50000)
    ^ ESTIMATED vs ACTUAL. A large gap means the planner is working from bad
      statistics, and a bad plan usually follows. Run ANALYZE.

  Buffers: shared hit=12 read=340
    ^ "hit" came from cache, "read" came from disk. Lots of reads on a query
      you run constantly is a sign the working set does not fit in memory.

Try it yourself:
  psql "$DATABASE_URL" -c "EXPLAIN ANALYZE SELECT ..."
`);

  await pool.query('DROP TABLE IF EXISTS stage4.big_tasks');
} catch (error) {
  console.error('\nExplain run failed.');
  console.error(explainConnectionError(error));
  process.exitCode = 1;
} finally {
  await closePool();
}

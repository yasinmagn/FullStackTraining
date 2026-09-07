/**
 * Run every labelled block in sql/03-queries.sql and print the results.
 *
 *   npm run queries --workspace backend-stage-4-sql-postgres
 *
 * Read the SQL and its output side by side, then open psql and change things.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, explainConnectionError, pool } from './db.ts';

const sqlDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'sql');

/** Split on `-- name: <label>` markers. */
function splitNamedQueries(sql: string): { name: string; text: string }[] {
  return sql
    .split(/^-- name:\s*/m)
    .slice(1)
    .map((block) => {
      const newline = block.indexOf('\n');
      return { name: block.slice(0, newline).trim(), text: block.slice(newline + 1).trim() };
    })
    .filter((q) => q.text !== '');
}

try {
  const sql = await readFile(join(sqlDir, '03-queries.sql'), 'utf8');

  for (const query of splitNamedQueries(sql)) {
    console.log(`\n${'='.repeat(72)}\n${query.name}\n${'='.repeat(72)}`);
    const result = await pool.query(query.text);
    if (result.rows.length === 0) {
      console.log('(no rows)');
    } else {
      console.table(result.rows);
    }
  }

  console.log('\nNext:  npm run explain --workspace backend-stage-4-sql-postgres');
} catch (error) {
  console.error('\nQuery run failed.');
  console.error(explainConnectionError(error));
  process.exitCode = 1;
} finally {
  await closePool();
}

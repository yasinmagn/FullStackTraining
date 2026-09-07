/**
 * Create the stage4 schema and load the seed data.
 *
 *   npm run db:setup --workspace backend-stage-4-sql-postgres
 *
 * Safe to re-run: 01-schema.sql starts with DROP SCHEMA ... CASCADE, so this
 * always gives you a clean slate. That is fine for a lesson schema and would be
 * catastrophic in production - Stage 5 introduces migrations, which is how you
 * change a schema you cannot drop.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, explainConnectionError, pool } from './db.ts';

const sqlDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'sql');

async function runFile(name: string) {
  const sql = await readFile(join(sqlDir, name), 'utf8');
  await pool.query(sql);
  console.log(`  applied ${name}`);
}

try {
  const { rows } = await pool.query<{ version: string; db: string }>(
    'SELECT version() AS version, current_database() AS db',
  );
  console.log(`Connected to "${rows[0]!.db}"`);
  console.log(`  ${rows[0]!.version.split(',')[0]}`);

  await runFile('01-schema.sql');
  await runFile('02-seed.sql');

  const counts = await pool.query<{ users: number; projects: number; tasks: number }>(`
    SELECT
      (SELECT count(*) FROM stage4.users)    AS users,
      (SELECT count(*) FROM stage4.projects) AS projects,
      (SELECT count(*) FROM stage4.tasks)    AS tasks
  `);

  console.log('\nSeeded:', counts.rows[0]);
  console.log('\nNext:  npm run queries --workspace backend-stage-4-sql-postgres');
} catch (error) {
  console.error('\nDatabase setup failed.');
  console.error(explainConnectionError(error));
  process.exitCode = 1;
} finally {
  // Without this the pool keeps the event loop alive and the script hangs.
  await closePool();
}

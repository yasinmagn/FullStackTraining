#!/usr/bin/env node
/**
 * Migration CLI.
 *
 *   npm run db:migrate         --workspace backend-final-project
 *   npm run db:migrate:status  --workspace backend-final-project
 *   npm run db:migrate:down    --workspace backend-final-project
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, safeDatabaseUrl } from '../config/index.ts';
import { createPool, explainConnectionError } from '../db/pool.ts';
import { appliedMigrations, loadMigrations, migrateDown, migrateUp } from '../db/migrator.ts';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations');
const command = process.argv[2] ?? 'status';

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(`\n${(error as Error).message}\n`);
  process.exit(1);
}

const pool = createPool(config);

try {
  console.log(`Database: ${safeDatabaseUrl(config.DATABASE_URL)}`);

  switch (command) {
    case 'up': {
      const result = await migrateUp(pool, migrationsDir);
      console.log(
        result.applied.length === 0
          ? `Up to date - ${result.alreadyApplied.length} migration(s) already applied.`
          : `Applied ${result.applied.length}: ${result.applied.join(', ')}`,
      );
      break;
    }
    case 'down': {
      const reverted = await migrateDown(pool, migrationsDir);
      console.log(reverted ? `Reverted ${reverted}.` : 'Nothing to revert.');
      break;
    }
    case 'status': {
      const [onDisk, applied] = await Promise.all([loadMigrations(migrationsDir), appliedMigrations(pool)]);
      const appliedIds = new Set(applied.map((row) => row.id));

      console.log('\n  id   status    name');
      console.log('  ---- --------- ----------------------------------------');
      for (const migration of onDisk) {
        console.log(`  ${migration.id}  ${(appliedIds.has(migration.id) ? 'applied' : 'PENDING').padEnd(9)} ${migration.name}`);
      }
      console.log('');
      break;
    }
    default:
      console.error(`Unknown command: ${command}. Use up, down or status.`);
      process.exitCode = 2;
  }
} catch (error) {
  console.error(`\n${explainConnectionError(error)}\n`);
  process.exitCode = 1;
} finally {
  await pool.end();
}

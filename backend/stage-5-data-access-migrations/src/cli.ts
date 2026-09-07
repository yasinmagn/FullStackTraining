#!/usr/bin/env node
/**
 * Migration CLI.
 *
 *   npm run migrate         --workspace backend-stage-5-data-access-migrations
 *   npm run migrate:status  --workspace backend-stage-5-data-access-migrations
 *   npm run migrate:down    --workspace backend-stage-5-data-access-migrations
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from './db/pool.ts';
import { appliedMigrations, loadMigrations, migrateDown, migrateUp } from './db/migrator.ts';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const command = process.argv[2] ?? 'status';

const pool = createPool();

try {
  switch (command) {
    case 'up': {
      console.log('Running migrations...');
      const result = await migrateUp(pool, migrationsDir);
      console.log(
        result.applied.length === 0
          ? `Nothing to do - ${result.alreadyApplied.length} migration(s) already applied.`
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
      const [onDisk, applied] = await Promise.all([
        loadMigrations(migrationsDir),
        appliedMigrations(pool),
      ]);
      const appliedIds = new Set(applied.map((row) => row.id));

      console.log('\n  id   status    name');
      console.log('  ---- --------- ----------------------------------------');
      for (const migration of onDisk) {
        const state = appliedIds.has(migration.id) ? 'applied' : 'PENDING';
        console.log(`  ${migration.id}  ${state.padEnd(9)} ${migration.name}`);
      }
      console.log('');
      break;
    }

    default:
      console.error(`Unknown command: ${command}. Use up, down or status.`);
      process.exitCode = 2;
  }
} catch (error) {
  console.error(`\n${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}

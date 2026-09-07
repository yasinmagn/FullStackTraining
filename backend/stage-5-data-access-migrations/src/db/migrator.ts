import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool } from 'pg';
import { createHash } from 'node:crypto';

/**
 * A MIGRATION RUNNER, in about 150 lines.
 *
 * Stage 4 could get away with `DROP SCHEMA ... CASCADE` because it was a
 * lesson. You cannot drop a production database, so schema changes have to be
 * applied incrementally, in order, exactly once, on every environment.
 *
 * That is all a migration tool is. Real ones (node-pg-migrate, Flyway,
 * Prisma Migrate, Knex) add more, but every one of them is built on the four
 * ideas below - and knowing them means you can debug the tool when it wedges.
 */

export interface Migration {
  /** Sort key AND identity. `001`, `002`, ... - order is not negotiable. */
  id: string;
  name: string;
  up: string;
  down: string | null;
}

export interface AppliedMigration {
  id: string;
  name: string;
  checksum: string;
  applied_at: Date;
}

/**
 * IDEA 1: the database remembers what has been applied.
 *
 * A table, in the database itself, is the only source of truth that survives a
 * new laptop, a new environment and a new team member.
 */
const MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id         text        PRIMARY KEY,
    name       text        NOT NULL,
    checksum   text        NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;

/**
 * IDEA 2: only one process may migrate at a time.
 *
 * Deploy four containers at once and all four start migrating simultaneously.
 * Without a lock they race: duplicate CREATE TABLE, half-applied changes, a
 * deployment that fails in a way nobody can reproduce.
 *
 * A PostgreSQL ADVISORY LOCK is perfect for this. It is a named lock the
 * database holds on your behalf, it costs nothing, and it is released
 * automatically if the process dies - so a crashed deploy cannot wedge the
 * next one.
 */
const LOCK_ID = 4_711_982; // any constant; it just has to be the same everywhere

function checksum(sql: string): string {
  return createHash('sha256').update(sql).digest('hex').slice(0, 16);
}

/**
 * Load migrations from disk.
 *
 * Convention: `001_create_tasks.sql`, containing
 *
 *     -- migrate:up
 *     CREATE TABLE ...
 *     -- migrate:down
 *     DROP TABLE ...
 */
export async function loadMigrations(dir: string): Promise<Migration[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  return Promise.all(
    files.map(async (file) => {
      const contents = await readFile(join(dir, file), 'utf8');
      const [id = file, ...rest] = file.replace(/\.sql$/, '').split('_');

      const upMatch = contents.split(/^--\s*migrate:up\s*$/m)[1] ?? contents;
      const [up = '', down = null] = upMatch.split(/^--\s*migrate:down\s*$/m);

      return {
        id,
        name: rest.join('_') || file,
        up: up.trim(),
        down: down?.trim() ?? null,
      };
    }),
  );
}

export async function appliedMigrations(pool: Pool): Promise<AppliedMigration[]> {
  await pool.query(MIGRATIONS_TABLE_SQL);
  const { rows } = await pool.query<AppliedMigration>(
    'SELECT id, name, checksum, applied_at FROM schema_migrations ORDER BY id',
  );
  return rows;
}

export interface MigrateResult {
  applied: string[];
  alreadyApplied: string[];
}

/**
 * Apply every pending migration, in order.
 */
export async function migrateUp(
  pool: Pool,
  dir: string,
  logger: Pick<Console, 'log'> = console,
): Promise<MigrateResult> {
  const migrations = await loadMigrations(dir);
  const client = await pool.connect();

  const result: MigrateResult = { applied: [], alreadyApplied: [] };

  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(MIGRATIONS_TABLE_SQL);

    const { rows: applied } = await client.query<AppliedMigration>(
      'SELECT id, name, checksum FROM schema_migrations',
    );
    const byId = new Map(applied.map((row) => [row.id, row]));

    for (const migration of migrations) {
      const existing = byId.get(migration.id);

      if (existing) {
        /*
         * IDEA 3: detect EDITED migrations.
         *
         * Editing a migration that has already run is one of the most damaging
         * things you can do to a team: your database has the old version, the
         * next person's has the new one, and nothing tells you until something
         * breaks in a way that makes no sense. The checksum catches it
         * immediately.
         *
         * The rule: an applied migration is IMMUTABLE. Write a new one.
         */
        if (existing.checksum !== checksum(migration.up)) {
          throw new Error(
            `Migration ${migration.id}_${migration.name} has been modified since it was applied.\n` +
              `  applied checksum: ${existing.checksum}\n` +
              `  current checksum: ${checksum(migration.up)}\n` +
              `An applied migration is immutable. Write a NEW migration instead.`,
          );
        }
        result.alreadyApplied.push(migration.id);
        continue;
      }

      /*
       * IDEA 4: each migration is its own TRANSACTION.
       *
       * PostgreSQL supports transactional DDL - CREATE TABLE, ALTER TABLE and
       * friends can be rolled back. (MySQL cannot do this, which is why
       * migrations there are so much more dangerous.)
       *
       * So a migration that fails halfway leaves the schema exactly as it was,
       * and the schema_migrations row is rolled back with it.
       */
      logger.log(`  applying ${migration.id}_${migration.name}`);
      await client.query('BEGIN');
      try {
        await client.query(migration.up);
        await client.query(
          'INSERT INTO schema_migrations (id, name, checksum) VALUES ($1, $2, $3)',
          [migration.id, migration.name, checksum(migration.up)],
        );
        await client.query('COMMIT');
        result.applied.push(migration.id);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(
          `Migration ${migration.id}_${migration.name} failed: ${(error as Error).message}`,
          { cause: error },
        );
      }
    }

    return result;
  } finally {
    // Release the lock even on failure, or the next deploy hangs.
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}

/**
 * Roll back the most recently applied migration.
 *
 * Useful in development. In production, prefer rolling FORWARD with a new
 * migration: a `down` that drops a column destroys data, and the deploy that
 * needed rolling back has usually already written some.
 */
export async function migrateDown(
  pool: Pool,
  dir: string,
  logger: Pick<Console, 'log'> = console,
): Promise<string | null> {
  const migrations = await loadMigrations(dir);
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(MIGRATIONS_TABLE_SQL);

    const { rows } = await client.query<{ id: string; name: string }>(
      'SELECT id, name FROM schema_migrations ORDER BY id DESC LIMIT 1',
    );
    const last = rows[0];
    if (!last) return null;

    const migration = migrations.find((m) => m.id === last.id);
    if (!migration?.down) {
      throw new Error(`Migration ${last.id}_${last.name} has no "-- migrate:down" section.`);
    }

    logger.log(`  reverting ${migration.id}_${migration.name}`);
    await client.query('BEGIN');
    try {
      await client.query(migration.down);
      await client.query('DELETE FROM schema_migrations WHERE id = $1', [migration.id]);
      await client.query('COMMIT');
      return migration.id;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}

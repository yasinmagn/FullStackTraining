import { config as loadDotenv } from 'dotenv';
import pg, { type Pool, type PoolClient } from 'pg';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Connection management.
 *
 * No credentials in this file, or in any tracked file. `DATABASE_URL` comes
 * from the environment; `.env` at the repo root supplies it in development and
 * is git-ignored.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
loadDotenv({ path: join(repoRoot, '.env'), quiet: true });

// COUNT(*) returns BIGINT, which pg gives you as a string to avoid silently
// losing precision above 2^53. Our counts are small; parse them. Do NOT do this
// for real bigint id columns.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10));

export interface PoolOptions {
  connectionString?: string;
  max?: number;
}

export function createPool(options: PoolOptions = {}): Pool {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env at the repo root and fill it in. ' +
        '.env is git-ignored - never commit real credentials.',
    );
  }

  const pool = new pg.Pool({
    connectionString,
    max: options.max ?? (Number(process.env.DATABASE_POOL_MAX) || 10),
    connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS) || 10_000,
    idleTimeoutMillis: 30_000,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  // An idle client can die silently - a network blip, a database restart.
  // Without this listener the error is unhandled and kills the process.
  pool.on('error', (error) => {
    console.error('Idle database client error:', error.message);
  });

  return pool;
}

/**
 * THE UNIT OF WORK.
 *
 * Everything inside the callback runs on ONE connection, inside ONE
 * transaction. Copy this into every project you write.
 *
 * Three details, each of which is a production incident if you get it wrong:
 *
 *   1. `pool.connect()`, not `pool.query()`. A transaction is state on one
 *      connection; issuing BEGIN and COMMIT through the pool can put them on
 *      different connections. It looks fine in development, where the pool has
 *      one idle client, and corrupts data under load.
 *
 *   2. ROLLBACK is in a `catch` that RE-THROWS. Swallowing the error here
 *      would report success for work that was just discarded.
 *
 *   3. `release()` is in `finally`. A client that is never released is gone
 *      from the pool forever; leak `max` of them and the app stops responding
 *      with no error at all - every request just waits.
 */
export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // The connection may already be dead. Log it, but let the ORIGINAL error
      // propagate - it is the one that explains what actually went wrong.
      console.error('Rollback failed:', (rollbackError as Error).message);
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * A queryable thing: either the pool (auto-commit) or a transaction client.
 *
 * Repository methods take this rather than a `Pool`, which is what lets the
 * SAME method be called standalone or as part of a larger transaction. Without
 * it you end up with `createTask` and `createTaskInTransaction` side by side,
 * and they drift.
 */
export interface Queryable {
  query: Pool['query'];
}

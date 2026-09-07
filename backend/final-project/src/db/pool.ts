import pg, { type Pool, type PoolClient } from 'pg';
import type { Config } from '../config/index.ts';

/**
 * The connection pool, built FROM THE VALIDATED CONFIG.
 *
 * Note the shape: this function takes a `Config` rather than reading
 * `process.env` itself. That is what lets the tests build a pool against
 * TEST_DATABASE_URL with no global state, and it is why config validation
 * happens in exactly one place.
 */

// COUNT(*) returns BIGINT, which pg gives you as a string to avoid silently
// losing precision above 2^53. Our counts are page-sized; parse them.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10));

export function createPool(config: Pick<Config,
  'DATABASE_URL' | 'DATABASE_SSL' | 'DATABASE_POOL_MAX' | 'DATABASE_CONNECTION_TIMEOUT_MS'>): Pool {
  const pool = new pg.Pool({
    connectionString: config.DATABASE_URL,
    max: config.DATABASE_POOL_MAX,
    connectionTimeoutMillis: config.DATABASE_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: 30_000,
    // Most managed providers (Neon, Supabase, RDS, Railway, Azure) require TLS.
    ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  });

  // An idle client can die silently. Without this listener the error is
  // unhandled and takes the process down.
  pool.on('error', (error) => {
    console.error(JSON.stringify({ level: 'error', msg: 'db.idleClientError', message: error.message }));
  });

  return pool;
}

/** Either the pool (auto-commit) or a transaction client. */
export interface Queryable {
  query: Pool['query'];
}

/**
 * The unit of work. Three rules, each a production incident if broken:
 *   1. a DEDICATED client - a transaction is state on one connection
 *   2. ROLLBACK in a catch that RE-THROWS
 *   3. release() in `finally` - a leaked client is gone from the pool forever
 */
export async function withTransaction<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The connection may already be dead. Let the ORIGINAL error propagate -
      // it is the one that explains what went wrong.
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Friendly diagnosis for the connection failures you will actually hit. */
export function explainConnectionError(error: unknown): string {
  const code = (error as { code?: string }).code;
  switch (code) {
    case 'ECONNREFUSED':
      return 'Nothing is listening on that host/port. Is PostgreSQL running?';
    case 'ENOTFOUND':
      return 'That hostname does not resolve. Check the host in DATABASE_URL.';
    case '28P01':
      return 'Password authentication failed. Check the user and password in DATABASE_URL.';
    case '3D000':
      return 'That database does not exist. Create it first, e.g. createdb fullstack_training';
    case '28000':
      return 'The server rejected the connection (pg_hba.conf). Check host, user and SSL settings.';
    case 'ETIMEDOUT':
      return 'The connection timed out - a firewall, or the wrong host. Managed providers usually need DATABASE_SSL=true.';
    default:
      return error instanceof Error ? error.message : String(error);
  }
}

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Database connection, configured entirely from the environment.
 *
 * THERE IS NO CONNECTION STRING IN THIS FILE, and there must never be one in
 * any file that git tracks. The real value lives in `.env` at the repo root,
 * which is git-ignored; `.env.example` documents the shape with placeholders.
 *
 * Run `npm run check:secrets` from the repo root to prove nothing leaked.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// Load the repo-root .env. Every backend stage shares one file, so you
// configure your database once rather than per lesson.
loadDotenv({ path: join(repoRoot, '.env'), quiet: true });

const { Pool } = pg;

/**
 * `pg` returns some types as strings by default, which surprises people.
 *
 * BIGINT (OID 20) is the important one: JavaScript numbers lose precision above
 * 2^53, so the driver hands you a string rather than silently corrupting large
 * ids. `COUNT(*)` returns BIGINT, so `row.count` is `'42'`, not `42`.
 *
 * Our counts are small and known-safe, so we parse them. Do NOT do this for
 * real bigint id columns.
 */
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10));

/**
 * NUMERIC (OID 1700) also arrives as a string, and that one is CORRECT -
 * NUMERIC is arbitrary precision, which is exactly why you use it for money.
 * Parsing it to a float would throw away the precision you chose it for.
 * We leave it alone.
 */

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url || url.trim() === '') {
    throw new Error(
      [
        'DATABASE_URL is not set.',
        '',
        '  1. Copy .env.example to .env at the repo root:',
        '       Windows : copy .env.example .env',
        '       macOS   : cp .env.example .env',
        '  2. Set DATABASE_URL to your PostgreSQL connection string, e.g.',
        '       postgresql://USER:PASSWORD@localhost:5432/fullstack_training',
        '',
        '.env is git-ignored. Never commit real credentials.',
      ].join('\n'),
    );
  }

  return url;
}

/**
 * A connection POOL, not a single connection.
 *
 * Opening a PostgreSQL connection is expensive - a TCP handshake, TLS,
 * authentication, and a whole backend PROCESS forked on the server. A pool
 * keeps a small set open and lends them out.
 *
 * `max` is the number of server processes you are willing to occupy. Bigger is
 * not better: PostgreSQL's own limit is `max_connections` (often 100), shared
 * across every instance of your app, plus migrations, plus whatever your
 * colleague has open in a GUI.
 */
export const pool = new Pool({
  connectionString: requireDatabaseUrl(),
  max: Number(process.env.DATABASE_POOL_MAX) || 10,
  connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS) || 10_000,
  // Return an idle connection to the OS after 30s, so a quiet app does not
  // hold server processes open all night.
  idleTimeoutMillis: 30_000,
  // Most managed providers (Neon, Supabase, RDS, Azure) require TLS.
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

/**
 * An idle client can die without anyone noticing - a network blip, or the
 * database restarting. Without this listener the error is unhandled and takes
 * the process down.
 */
pool.on('error', (error) => {
  console.error('Unexpected error on an idle database client:', error.message);
});

/** Print a friendly diagnosis for the connection failures you will actually hit. */
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
      return 'That database does not exist. Create it, e.g.  createdb fullstack_training';
    case '28000':
      return 'The server rejected the connection (pg_hba.conf). Check host, user and SSL settings.';
    case 'ETIMEDOUT':
      return 'The connection timed out. A firewall, or the wrong host.';
    default:
      return error instanceof Error ? error.message : String(error);
  }
}

/** Close the pool. Without this, `tsx` scripts hang forever with no output. */
export async function closePool(): Promise<void> {
  await pool.end();
}

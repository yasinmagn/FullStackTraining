import { config as loadDotenv } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * CONFIGURATION - validated once, at boot.
 *
 * =============================================================================
 * WHERE YOUR DATABASE CREDENTIALS LIVE
 * =============================================================================
 * This file reads `DATABASE_URL` from the environment, and the repo-root `.env`
 * supplies it in development. `.env` is git-ignored; `.env.example` documents
 * the shape with placeholders only.
 *
 * NO CONNECTION STRING, PASSWORD OR SECRET APPEARS ANYWHERE IN THIS REPOSITORY.
 * `npm run check:secrets` from the root proves it, and fails the build if that
 * ever stops being true.
 *
 * PRECEDENCE: a real environment variable wins over `.env`. dotenv does not
 * overwrite what is already set - which is correct, because production sets
 * real env vars and a stale `.env` must never override them. If your edits to
 * `.env` appear to do nothing, check `echo $DATABASE_URL` first.
 * =============================================================================
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
loadDotenv({ path: join(repoRoot, '.env'), quiet: true });

/**
 * Everything the app needs, in one schema.
 *
 * A single `.parse` at startup means a missing variable is ONE clear error
 * before the server binds a port - not `undefined` surfacing inside a request
 * at 3am on a rarely-hit code path.
 */
const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // --- Database ------------------------------------------------------------
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
      'DATABASE_URL must start with postgres:// or postgresql://',
    ),
  DATABASE_SSL: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

  // --- Auth ----------------------------------------------------------------
  // 32 characters minimum. There is deliberately NO DEFAULT: a fallback secret
  // ships to production the first time an env var is forgotten, and then anyone
  // who has read the source can mint a token for any user.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),

  // --- CORS ----------------------------------------------------------------
  // An allow-list, never a reflector. Comma-separated.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),
});

export type Config = z.infer<typeof configSchema> & { isProduction: boolean };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = configSchema.safeParse(env);

  if (!parsed.success) {
    // A readable, actionable message. Compare with a raw ZodError dump, which
    // is the difference between fixing this in ten seconds and ten minutes.
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Invalid configuration:\n${problems}\n\n` +
        'Fix your environment:\n' +
        '  1. Copy .env.example to .env at the repo root\n' +
        '       Windows : copy .env.example .env\n' +
        '       macOS   : cp .env.example .env\n' +
        '  2. Set DATABASE_URL to your real PostgreSQL connection string\n' +
        '  3. Generate a JWT_SECRET:\n' +
        '       node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"\n\n' +
        '.env is git-ignored. Never commit real credentials.',
    );
  }

  return { ...parsed.data, isProduction: parsed.data.NODE_ENV === 'production' };
}

/**
 * Redact a connection string for logging.
 *
 * You DO want to log which host and database you connected to - it is the first
 * thing you check when the data looks wrong. You never want the password in a
 * log aggregator that half the company can search.
 */
export function safeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '<unparseable DATABASE_URL>';
  }
}

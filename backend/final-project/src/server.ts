/**
 * THE COMPOSITION ROOT.
 *
 * The only file that knows how everything is wired:
 *
 *   config -> pool -> repositories -> services -> http app -> server
 *
 * Everything else takes its dependencies as arguments, which is why everything
 * else is testable without a running process.
 */
import { loadConfig, safeDatabaseUrl } from './config/index.ts';
import { createPool, explainConnectionError } from './db/pool.ts';
import { createTaskRepository } from './repository/taskRepository.ts';
import { createUserRepository } from './repository/userRepository.ts';
import { createTaskService } from './service/taskService.ts';
import { createAuthService } from './service/authService.ts';
import { createApp } from './http/app.ts';
import { createLogger } from './observability/logger.ts';
import type { HealthCheck } from './observability/health.ts';

// Throws with an actionable message if DATABASE_URL or JWT_SECRET is missing.
// A container that refuses to start is a page you can act on; one that starts
// and then quietly 500s is not.
let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(`\n${(error as Error).message}\n`);
  process.exit(1);
}

const logger = createLogger({ level: config.LOG_LEVEL });
const pool = createPool(config);

const taskRepository = createTaskRepository(pool);
const userRepository = createUserRepository(pool);
const taskService = createTaskService(taskRepository);
const authService = createAuthService(userRepository, config);

/**
 * READINESS depends on the database; LIVENESS deliberately does not.
 *
 * `SELECT 1` is the cheapest possible proof that a connection can be taken from
 * the pool and used.
 */
const healthChecks: HealthCheck[] = [
  {
    name: 'database',
    critical: true,
    timeoutMs: 2000,
    check: async () => {
      await pool.query('SELECT 1');
      return true;
    },
  },
];

const app = createApp({ config, authService, taskService, logger, healthChecks });

// Verify the database is reachable BEFORE binding a port. Starting up and then
// failing every request is a worse experience than refusing to start.
try {
  const { rows } = await pool.query<{ db: string }>('SELECT current_database() AS db');
  logger.info('db.connected', { database: rows[0]?.db, url: safeDatabaseUrl(config.DATABASE_URL) });
} catch (error) {
  logger.error('db.connectionFailed', { message: explainConnectionError(error) });
  console.error(`\nCould not connect to the database.\n  ${explainConnectionError(error)}\n`);
  console.error('Check DATABASE_URL in your .env, then run:');
  console.error('  npm run db:setup\n');
  await pool.end();
  process.exit(1);
}

const server = app.listen(config.PORT, () => {
  logger.info('server.started', { port: config.PORT, env: config.NODE_ENV, pid: process.pid });
  console.log(`\nAPI listening on http://localhost:${config.PORT}`);
  console.log(`  health   GET  /health/ready`);
  console.log(`  register POST /auth/register`);
  console.log(`  tasks    GET  /api/tasks   (needs a Bearer token)\n`);
});

/**
 * GRACEFUL SHUTDOWN.
 *
 *   1. stop accepting new connections, let in-flight requests finish
 *   2. close the database pool
 *   3. exit
 *
 * Plus a hard timeout, because a hung request must not block the deploy -
 * SIGKILL is coming either way, and exiting on your own terms leaves a log line.
 */
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    logger.warn('shutdown.forced', { signal });
    process.exit(1);
  }
  shuttingDown = true;
  logger.info('shutdown.started', { signal });

  const force = setTimeout(() => {
    logger.error('shutdown.timeout', { afterMs: 15_000 });
    process.exit(1);
  }, 15_000);
  force.unref();

  server.close(async (error) => {
    if (error) {
      logger.error('shutdown.serverCloseFailed', { message: error.message });
      process.exit(1);
    }
    // Close the pool AFTER in-flight requests finish - they may still need it.
    await pool.end().catch(() => {});
    logger.info('shutdown.complete');
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  // The process is now in an unknown state - a promise half-resolved, a
  // transaction half-committed. Log and exit.
  logger.error('uncaught.exception', { message: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled.rejection', { reason: String(reason) });
  process.exit(1);
});

import { createApp } from './http/app.ts';
import { createLogger } from './observability/logger.ts';
import { createMetrics } from './observability/metrics.ts';
import type { HealthCheck } from './observability/health.ts';

const logger = createLogger();
const metrics = createMetrics();
const port = Number(process.env.PORT) || 3000;

/**
 * Readiness checks. In the final project the first of these is a real
 * `SELECT 1` against PostgreSQL.
 */
const healthChecks: HealthCheck[] = [
  { name: 'database', check: async () => true, critical: true, timeoutMs: 2000 },
  // Non-critical: if the cache is down the service is slower, not broken, so it
  // should stay in the load balancer.
  { name: 'cache', check: async () => true, critical: false, timeoutMs: 500 },
];

const app = createApp({ logger, metrics, healthChecks });
const server = app.listen(port, () => {
  logger.info('server.started', { port, pid: process.pid });
});

/**
 * GRACEFUL SHUTDOWN, in full.
 *
 * The sequence matters:
 *   1. Stop passing readiness, so the load balancer stops sending new work.
 *      (A few seconds here lets in-flight routing settle - without it you can
 *      still receive requests after you have begun shutting down.)
 *   2. server.close() - stop accepting connections, let in-flight finish.
 *   3. Close dependencies: database pool, queue consumers, timers.
 *   4. Exit.
 *
 * And a hard timeout, because a hung request must not block the deploy - the
 * orchestrator's SIGKILL is coming either way, and you would rather exit on
 * your own terms with a log line.
 */
let shuttingDown = false;

function shutdown(signal: string) {
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

  server.close((error) => {
    if (error) {
      logger.error('shutdown.failed', { message: error.message });
      process.exit(1);
    }
    logger.info('shutdown.complete');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * After an uncaught exception the process is in an UNKNOWN state - a promise
 * half-resolved, a transaction half-committed. Log it and exit; a supervisor
 * restarting a clean process beats a live process nobody can reason about.
 */
process.on('uncaughtException', (error) => {
  logger.error('uncaught.exception', { message: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled.rejection', { reason: String(reason) });
  process.exit(1);
});

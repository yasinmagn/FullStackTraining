import type { RequestHandler } from 'express';

/**
 * HEALTH CHECKS.
 *
 * Two endpoints, and the distinction is the whole point. Getting it wrong is
 * how a deploy turns into an outage.
 *
 *   /health/live   LIVENESS  - "is this process broken beyond repair?"
 *                  Failing it means the orchestrator KILLS AND RESTARTS you.
 *
 *   /health/ready  READINESS - "can I serve traffic right now?"
 *                  Failing it means you are removed from the load balancer,
 *                  and put back when you recover.
 *
 * THE CLASSIC OUTAGE: liveness checks the database. The database has a brief
 * hiccup, so every pod fails liveness, so Kubernetes restarts every pod at
 * once, so they all reconnect simultaneously and hammer the recovering
 * database. A five-second blip becomes a thirty-minute outage.
 *
 *   Liveness  must check ONLY the process itself. No dependencies.
 *   Readiness checks dependencies.
 */

export interface HealthCheck {
  name: string;
  /** Resolve for healthy; throw or resolve false for unhealthy. */
  check: () => Promise<boolean>;
  /**
   * A failing OPTIONAL dependency degrades the service without taking it out
   * of the load balancer. Your cache being down should slow you, not stop you.
   */
  critical?: boolean;
  timeoutMs?: number;
}

export interface HealthResult {
  status: 'ok' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  version: string;
  checks: Record<string, { status: 'ok' | 'failed'; durationMs: number; error?: string }>;
}

/**
 * LIVENESS. Deliberately trivial.
 *
 * If the event loop can run this handler, the process is alive. That is the
 * entire question. Adding a database call here is the bug described above.
 */
export function livenessHandler(): RequestHandler {
  return (_req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  };
}

/**
 * READINESS. Checks dependencies, with a timeout on each.
 *
 * The timeout matters: a health check that hangs is worse than one that fails,
 * because the orchestrator learns nothing and waits.
 */
export function readinessHandler(
  checks: HealthCheck[],
  version = process.env.APP_VERSION ?? 'dev',
): RequestHandler {
  return async (_req, res) => {
    const results: HealthResult['checks'] = {};
    let criticalFailure = false;
    let anyFailure = false;

    // Run them in parallel: a readiness probe has a deadline, and checking
    // five dependencies in series can blow it on its own.
    await Promise.all(
      checks.map(async (check) => {
        const startedAt = performance.now();
        try {
          const healthy = await withTimeout(check.check(), check.timeoutMs ?? 2000, check.name);

          if (healthy) {
            results[check.name] = { status: 'ok', durationMs: round(performance.now() - startedAt) };
            return;
          }
          throw new Error('check returned false');
        } catch (error) {
          anyFailure = true;
          if (check.critical !== false) criticalFailure = true;

          results[check.name] = {
            status: 'failed',
            durationMs: round(performance.now() - startedAt),
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    const status: HealthResult['status'] = criticalFailure ? 'unhealthy' : anyFailure ? 'degraded' : 'ok';

    /*
     * 503, not 200-with-a-body. The load balancer reads the STATUS CODE; it
     * does not parse your JSON. A cheerful 200 saying `{"status":"unhealthy"}`
     * keeps you in the rotation, serving errors.
     */
    res.status(criticalFailure ? 503 : 200).json({
      status,
      uptimeSeconds: Math.round(process.uptime()),
      version,
      checks: results,
    } satisfies HealthResult);
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${name} check timed out after ${ms}ms`)), ms);
  });
  // `finally` clears the timer on BOTH paths - otherwise a fast check leaves a
  // pending timer holding the event loop open.
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const round = (n: number) => Math.round(n * 100) / 100;

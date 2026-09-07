#!/usr/bin/env node
/**
 * A small CLI, so the process lifecycle is something you can see rather than
 * something you read about.
 *
 *   npm run report --workspace backend-stage-1-node-fundamentals
 *   node src/cli.mjs report data/tasks.json
 *   node src/cli.mjs report data/tasks.json --json
 *   node src/cli.mjs sleep 30           # then press Ctrl-C, and watch the shutdown
 */

import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { loadConfig } from './config.mjs';
import { parseTasks, readJsonFile, summarise } from './tasks.mjs';

/**
 * `node:util`'s parseArgs has been stable since Node 20. For anything short of
 * a real CLI framework it removes the need for a dependency.
 */
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

const HELP = `
Usage: node src/cli.mjs <command> [options]

Commands:
  report <file>     Summarise a tasks JSON file
  sleep <seconds>   Idle, so you can test Ctrl-C / SIGTERM handling

Options:
  --json            Print machine-readable output
  -h, --help        Show this message
`.trim();

/**
 * GRACEFUL SHUTDOWN.
 *
 * When a container is stopped, the orchestrator sends SIGTERM and then waits -
 * typically 30 seconds - before sending SIGKILL, which cannot be caught. Those
 * seconds are yours to finish in-flight requests, flush logs and close database
 * connections.
 *
 * Ignore SIGTERM and every deploy drops the requests that were in flight.
 *
 * The `once` flag matters: an impatient operator pressing Ctrl-C twice should
 * not run your cleanup twice concurrently.
 */
function onShutdown(cleanup) {
  let shuttingDown = false;

  const handle = async (signal) => {
    if (shuttingDown) {
      console.error(`\nReceived ${signal} again - exiting immediately.`);
      process.exit(1);
    }
    shuttingDown = true;
    console.error(`\nReceived ${signal}, shutting down gracefully...`);

    try {
      await cleanup(signal);
      process.exit(0);
    } catch (error) {
      console.error('Cleanup failed:', error);
      process.exit(1);
    }
  };

  // SIGINT  = Ctrl-C.  SIGTERM = `docker stop`, Kubernetes, systemd.
  process.on('SIGINT', () => void handle('SIGINT'));
  process.on('SIGTERM', () => void handle('SIGTERM'));
}

/**
 * Last-resort handlers.
 *
 * After an uncaught exception the process is in an UNKNOWN state - a promise
 * may be half-resolved, a transaction half-committed. Log it and exit; do not
 * try to carry on. A supervisor restarting a clean process beats a live process
 * you cannot reason about.
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

async function main() {
  const config = loadConfig();
  const [command, ...rest] = positionals;

  if (values.help || command === undefined) {
    console.log(HELP);
    return 0;
  }

  switch (command) {
    case 'report': {
      const file = rest[0];
      if (file === undefined) {
        console.error('report needs a file path. Try: node src/cli.mjs report data/tasks.json');
        return 2; // exit codes are an API: 0 ok, 1 error, 2 usage error
      }

      const tasks = parseTasks(await readJsonFile(file));
      const summary = summarise(tasks);

      if (values.json) {
        // stdout is for DATA. That is what makes `... --json | jq` work.
        console.log(JSON.stringify(summary, null, 2));
      } else {
        // stderr is for DIAGNOSTICS, so it does not pollute a piped stdout.
        console.error(`Environment: ${config.nodeEnv}`);
        console.log(`Tasks:      ${summary.total}`);
        console.log(`Done:       ${summary.byStatus.done} (${summary.percentComplete}%)`);
        console.log(`In progress:${String(summary.byStatus.in_progress).padStart(2)}`);
        console.log(`To do:      ${summary.byStatus.todo}`);
        console.log(`Hours left: ${summary.remainingHours} of ${summary.totalHours}`);
      }
      return 0;
    }

    case 'sleep': {
      const seconds = Number(rest[0] ?? 10);
      console.error(`Sleeping ${seconds}s. Press Ctrl-C to test graceful shutdown.`);

      onShutdown(async () => {
        console.error('  closing resources...');
        await sleep(300); // pretend to drain connections
        console.error('  done.');
      });

      // `node:timers/promises` gives you a promise-based setTimeout with no
      // callback nesting and no dependency.
      await sleep(seconds * 1000);
      return 0;
    }

    default:
      console.error(`Unknown command: ${command}\n\n${HELP}`);
      return 2;
  }
}

/**
 * Top-level error handling in one place.
 *
 * `process.exitCode = n` is gentler than `process.exit(n)`: it lets pending
 * writes to stdout flush before the process ends. `process.exit` can truncate
 * output, which produces genuinely baffling bug reports.
 */
try {
  process.exitCode = await main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  // `cause` (ES2022) preserves the original error. Always pass it through.
  if (error.cause) console.error(`Caused by: ${error.cause.message ?? error.cause}`);
  process.exitCode = 1;
}

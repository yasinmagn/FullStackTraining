/**
 * The entry point.
 *
 * `app.mjs` builds the app; this file binds it to a port and manages the
 * process lifecycle. Keeping them separate is what makes `app.test.mjs` able to
 * drive the app in-process with no port and no teardown.
 */
import { createApp } from './app.mjs';

const port = Number(process.env.PORT) || 3000;

const app = createApp({
  seed: [
    { id: '1', title: 'Understand middleware order', done: false },
    { id: '2', title: 'Return the right status codes', done: false },
  ],
  // Stack traces in development only. Never in production - see app.mjs.
  exposeStack: process.env.NODE_ENV !== 'production',
});

const server = app.listen(port, () => {
  console.log(`Express server on http://localhost:${port}`);
});

/**
 * GRACEFUL SHUTDOWN, now with an actual server to drain (Stage 1, section 8).
 *
 * `server.close()` stops accepting NEW connections and waits for in-flight
 * requests to finish. The timeout is the important half: a hung request must
 * not block the deploy forever, and the orchestrator's SIGKILL is coming
 * either way.
 */
function shutdown(signal) {
  console.log(`${signal} received, draining connections...`);

  const forceExit = setTimeout(() => {
    console.error('Shutdown timed out after 10s - forcing exit.');
    process.exit(1);
  }, 10_000);
  // Do not let this timer itself keep the process alive.
  forceExit.unref();

  server.close((error) => {
    if (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
    console.log('Closed cleanly.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

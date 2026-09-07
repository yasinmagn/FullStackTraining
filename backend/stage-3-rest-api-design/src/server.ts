/**
 * THE COMPOSITION ROOT.
 *
 * The only file that knows how every piece is wired together. Everything else
 * takes its dependencies as arguments, which is why everything else is
 * testable without a running process.
 *
 *   repository  ->  service  ->  http app  ->  server
 */
import { createApp } from './http/app.ts';
import { createInMemoryTaskRepository } from './repository/taskRepository.ts';
import { createTaskService } from './service/taskService.ts';
import { seedTasks } from './seed.ts';

const port = Number(process.env.PORT) || 3000;

const repository = createInMemoryTaskRepository(seedTasks());
const taskService = createTaskService(repository);
const app = createApp({ taskService, exposeStack: process.env.NODE_ENV !== 'production' });

const server = app.listen(port, () => {
  console.log(`Stage 3 API on http://localhost:${port}`);
  console.log(`Try:  curl 'localhost:${port}/api/tasks?status=todo&sort=priority&order=asc'`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, draining...`);
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

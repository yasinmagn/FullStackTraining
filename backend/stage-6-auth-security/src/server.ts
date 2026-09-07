import { config as loadDotenv } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './http/app.ts';
import { loadTokenConfig } from './auth/tokens.ts';
import { createInMemoryUserStore } from './auth/authRoutes.ts';
import { createInMemoryTaskStore } from './http/taskRoutes.ts';
import { hashPassword } from './auth/passwords.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
loadDotenv({ path: join(repoRoot, '.env'), quiet: true });

const port = Number(process.env.PORT) || 3000;

// Throws at BOOT if JWT_SECRET is missing or weak. That is the point: a
// container that refuses to start is a page you can act on.
const tokens = loadTokenConfig();

const users = createInMemoryUserStore([
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@example.com',
    displayName: 'Admin',
    // A DEMO password, hashed at startup. It is in the source because this is a
    // teaching server with an in-memory store that resets on every restart.
    // Real credentials live in .env and are never committed.
    passwordHash: await hashPassword('demo-password-1234'),
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
]);

const app = createApp({ users, tasks: createInMemoryTaskStore(), tokens });

const server = app.listen(port, () => {
  console.log(`Stage 6 API on http://localhost:${port}`);
  console.log(`
Try:
  curl -X POST localhost:${port}/auth/register -H 'content-type: application/json' \\
    -d '{"email":"me@example.com","displayName":"Me","password":"a-long-enough-password"}'

  curl localhost:${port}/api/tasks                       # 401
  curl localhost:${port}/api/tasks -H 'authorization: Bearer <token>'
`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, draining...`);
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

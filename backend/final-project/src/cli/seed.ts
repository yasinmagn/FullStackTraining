#!/usr/bin/env node
/**
 * Seed the database with a demo account and some tasks.
 *
 *   npm run db:seed --workspace backend-final-project
 *
 * SAFETY: refuses to run when NODE_ENV=production. Seeding a production
 * database with a known-password demo account is exactly the kind of accident
 * that becomes an incident report.
 *
 * It is also IDEMPOTENT - re-running it does not duplicate anything.
 */
import { loadConfig, safeDatabaseUrl } from '../config/index.ts';
import { createPool, explainConnectionError, withTransaction } from '../db/pool.ts';
import { createUserRepository } from '../repository/userRepository.ts';
import { createTaskRepository } from '../repository/taskRepository.ts';
import { createAuthService } from '../service/authService.ts';
import { createTaskService } from '../service/taskService.ts';

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(`\n${(error as Error).message}\n`);
  process.exit(1);
}

if (config.isProduction) {
  console.error('Refusing to seed with NODE_ENV=production.');
  process.exit(1);
}

const DEMO_EMAIL = 'demo@example.com';
// A demo password for a local development database only. It is printed to the
// console below precisely because it is not a secret.
const DEMO_PASSWORD = 'demo-password-1234';

const pool = createPool(config);
const users = createUserRepository(pool);
const tasks = createTaskRepository(pool);
const authService = createAuthService(users, config);
const taskService = createTaskService(tasks);

try {
  console.log(`Seeding ${safeDatabaseUrl(config.DATABASE_URL)}`);

  let user = await users.findByEmail(DEMO_EMAIL);

  if (user) {
    console.log('  demo account already exists');
  } else {
    const result = await authService.register({
      email: DEMO_EMAIL,
      displayName: 'Demo User',
      password: DEMO_PASSWORD,
    });
    user = await users.findByEmail(DEMO_EMAIL);
    console.log(`  created demo account ${result.user.email}`);
  }

  const existing = await taskService.list(user!.id, {
    page: 1,
    pageSize: 1,
    sort: 'createdAt',
    order: 'desc',
  });

  if (existing.meta.total > 0) {
    console.log(`  ${existing.meta.total} task(s) already present - leaving them alone`);
  } else {
    // One transaction: either all the seed tasks land, or none do.
    await withTransaction(pool, async (client) => {
      const seed = [
        { title: 'Read the final project README', priority: 'high' as const, dueDate: null, description: 'Start here.' },
        { title: 'Run the test suite', priority: 'high' as const, dueDate: null, description: 'It needs TEST_DATABASE_URL.' },
        { title: 'Connect the frontend', priority: 'medium' as const, dueDate: null, description: 'npm run web' },
        { title: 'Add a tags feature', priority: 'medium' as const, dueDate: null, description: 'Exercise 1.' },
        { title: 'Deploy it somewhere', priority: 'low' as const, dueDate: null, description: 'Exercise 6.' },
      ];

      for (const input of seed) {
        await tasks.create(
          {
            ownerId: user!.id,
            title: input.title,
            description: input.description,
            priority: input.priority,
            status: 'todo',
            dueDate: input.dueDate,
            completedAt: null,
          },
          client,
        );
      }
      console.log(`  created ${seed.length} tasks`);
    });
  }

  console.log(`
Done. Log in with:

  curl -X POST http://localhost:${config.PORT}/auth/login \\
    -H 'content-type: application/json' \\
    -d '{"email":"${DEMO_EMAIL}","password":"${DEMO_PASSWORD}"}'
`);
} catch (error) {
  console.error(`\nSeeding failed: ${explainConnectionError(error)}\n`);
  process.exitCode = 1;
} finally {
  await pool.end();
}

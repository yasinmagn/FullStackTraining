/**
 * A guided tour of the repository, against your real database.
 *
 *   npm run migrate --workspace backend-stage-5-data-access-migrations
 *   npm run demo    --workspace backend-stage-5-data-access-migrations
 *
 * It creates rows in a table called `tasks`, then deletes the ones it created.
 */
import { createPool, withTransaction } from './db/pool.ts';
import { createPostgresTaskRepository } from './repository/postgresTaskRepository.ts';
import { listTasksQuerySchema } from './domain/task.ts';
import { ConflictError } from './domain/errors.ts';

const pool = createPool();
const repository = createPostgresTaskRepository(pool);
const PREFIX = 'demo:';
const line = (label: string) => console.log(`\n${'='.repeat(70)}\n${label}\n${'='.repeat(70)}`);

try {
  // Clean up anything a previous run left behind.
  await pool.query(`DELETE FROM tasks WHERE title LIKE $1`, [`${PREFIX}%`]);

  line('1. Create, with RETURNING');
  const created = await repository.create({
    title: `${PREFIX}Write the repository`,
    description: 'Same interface as Stage 3, PostgreSQL underneath.',
    priority: 'high',
    status: 'todo',
    dueDate: '2026-04-01',
  });
  console.log('  id and timestamps came back in one round trip:');
  console.log(`    ${created.id}  createdAt=${created.createdAt}`);

  line('2. The database constraint catches what the service check cannot');
  try {
    await repository.create({ ...created, title: `${PREFIX}WRITE THE REPOSITORY` });
  } catch (error) {
    console.log(`  ${error instanceof ConflictError ? 'ConflictError' : 'Error'}: ${(error as Error).message}`);
    console.log('  Case-insensitive unique index (SQLSTATE 23505) -> 409, not 500.');
  }

  line('3. SQL injection is a non-event with parameterised queries');
  const injected = await repository.list(
    listTasksQuerySchema.parse({ q: "'; DROP TABLE tasks; --" }),
  );
  console.log(`  matched ${injected.meta.total} rows. The table is still here.`);

  line('4. The trigger maintains updated_at');
  await new Promise((r) => setTimeout(r, 15));
  const updated = await repository.update(created.id, { status: 'in_progress' });
  console.log(`  createdAt ${created.createdAt}`);
  console.log(`  updatedAt ${updated?.updatedAt}   <- nothing in the UPDATE set this`);

  line('5. A transaction: all of it, or none of it');
  const before = (await repository.list(listTasksQuerySchema.parse({ q: PREFIX }))).meta.total;
  try {
    await withTransaction(pool, async (client) => {
      await repository.create(
        { title: `${PREFIX}Rolled back`, description: null, priority: 'low', status: 'todo', dueDate: null },
        client,
      );
      // Duplicate of an existing title -> the whole transaction unwinds.
      await repository.create({ ...created, title: `${PREFIX}Write the repository` }, client);
    });
  } catch {
    console.log('  transaction failed and rolled back');
  }
  const after = (await repository.list(listTasksQuerySchema.parse({ q: PREFIX }))).meta.total;
  console.log(`  rows before ${before}, after ${after}  <- unchanged`);

  line('6. Pagination and total in ONE query');
  const page = await repository.list(listTasksQuerySchema.parse({ q: PREFIX, pageSize: 1 }));
  console.log(`  returned ${page.data.length} row, total ${page.meta.total}, pages ${page.meta.totalPages}`);
  console.log('  count(*) OVER () gave the pre-LIMIT total without a second query.');

  await pool.query(`DELETE FROM tasks WHERE title LIKE $1`, [`${PREFIX}%`]);
  console.log('\nCleaned up.\n');
} catch (error) {
  console.error(`\nDemo failed: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}

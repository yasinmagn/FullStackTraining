/** Drop the stage4 schema. Leaves the rest of the database alone. */
import { closePool, explainConnectionError, pool } from './db.ts';

try {
  await pool.query('DROP SCHEMA IF EXISTS stage4 CASCADE');
  console.log('Dropped schema stage4.');
} catch (error) {
  console.error(explainConnectionError(error));
  process.exitCode = 1;
} finally {
  await closePool();
}

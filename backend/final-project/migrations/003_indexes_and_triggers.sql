-- migrate:up

-- The hot query: "my tasks, filtered by status, newest first".
-- Column order matches how the query filters and then sorts, so PostgreSQL can
-- walk the index instead of sorting. See the Stage 4 EXPLAIN benchmark.
CREATE INDEX IF NOT EXISTS tasks_owner_status_created_idx
  ON tasks (owner_id, status, created_at DESC);

-- A PARTIAL index over only the open, dated tasks. Most tasks eventually become
-- 'done', so this stays small and cache-resident.
CREATE INDEX IF NOT EXISTS tasks_open_due_idx ON tasks (owner_id, due_date)
  WHERE status <> 'done' AND due_date IS NOT NULL;

-- updated_at, maintained by the database.
-- Doing this in application code means every code path must remember, and the
-- one that forgets is the one you debug at 2am.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks;
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down
DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks;
DROP TRIGGER IF EXISTS users_set_updated_at ON users;
DROP FUNCTION IF EXISTS set_updated_at();
DROP INDEX IF EXISTS tasks_owner_status_created_idx;
DROP INDEX IF EXISTS tasks_open_due_idx;

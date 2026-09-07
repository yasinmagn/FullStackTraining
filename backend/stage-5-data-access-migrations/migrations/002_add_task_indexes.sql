-- migrate:up
-- The hot query: filter by status, sort by creation date.
CREATE INDEX IF NOT EXISTS tasks_status_created_idx ON stage5.tasks (status, created_at DESC);

-- Partial index: most tasks end up 'done', so an index over only the open ones
-- with a due date stays small and cache-resident.
CREATE INDEX IF NOT EXISTS tasks_open_due_idx ON stage5.tasks (due_date)
  WHERE status <> 'done' AND due_date IS NOT NULL;

-- migrate:down
DROP INDEX IF EXISTS stage5.tasks_status_created_idx;
DROP INDEX IF EXISTS stage5.tasks_open_due_idx;

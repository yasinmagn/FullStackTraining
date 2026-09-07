-- migrate:up
CREATE TABLE IF NOT EXISTS stage5.tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  priority    text        NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high')),
  status      text        NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tasks_title_not_blank CHECK (length(trim(title)) > 0)
);

-- Case-insensitive uniqueness on title, matching the service rule from Stage 3.
-- Enforcing it in BOTH places is deliberate, not redundant: the service check
-- gives a good error message, and the database constraint is what actually
-- holds under concurrency. Two simultaneous requests can both pass the service
-- check; only one can pass this.
CREATE UNIQUE INDEX IF NOT EXISTS tasks_title_lower_key ON stage5.tasks (lower(title));

-- migrate:down
DROP TABLE IF EXISTS stage5.tasks;

-- migrate:up
CREATE TABLE IF NOT EXISTS tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership is a COLUMN, which is what makes every query scopeable to the
  -- authenticated user. ON DELETE CASCADE: deleting an account deletes its
  -- tasks - a deliberate choice, not a default. See the Stage 4 lesson.
  owner_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,

  title        text        NOT NULL,
  description  text,
  priority     text        NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low', 'medium', 'high')),
  status       text        NOT NULL DEFAULT 'todo'
                 CHECK (status IN ('todo', 'in_progress', 'done')),

  -- DATE, not timestamptz: a due date is a calendar day, not an instant.
  due_date     date,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,

  CONSTRAINT tasks_title_not_blank CHECK (length(trim(title)) > 0),

  -- A cross-column invariant the database enforces for every writer, including
  -- a manual UPDATE from psql.
  CONSTRAINT tasks_completed_at_matches_status CHECK (
    (status = 'done'  AND completed_at IS NOT NULL) OR
    (status <> 'done' AND completed_at IS NULL)
  )
);

-- Titles are unique PER OWNER, not globally. Two users may both have a task
-- called "Write tests"; one user may not have it twice.
CREATE UNIQUE INDEX IF NOT EXISTS tasks_owner_title_lower_key
  ON tasks (owner_id, lower(title));

-- migrate:down
DROP TABLE IF EXISTS tasks;

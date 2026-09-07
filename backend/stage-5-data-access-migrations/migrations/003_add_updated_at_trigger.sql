-- migrate:up
-- Maintaining updated_at in application code means every code path has to
-- remember, and a manual UPDATE from a SQL console never does.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks;
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- migrate:down
DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks;
DROP FUNCTION IF EXISTS set_updated_at();

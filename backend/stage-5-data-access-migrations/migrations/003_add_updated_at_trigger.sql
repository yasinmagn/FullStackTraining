-- migrate:up
-- Maintaining updated_at in application code means every code path has to
-- remember, and a manual UPDATE from a SQL console never does.
CREATE OR REPLACE FUNCTION stage5.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_set_updated_at ON stage5.tasks;
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON stage5.tasks
  FOR EACH ROW
  EXECUTE FUNCTION stage5.set_updated_at();

-- migrate:down
DROP TRIGGER IF EXISTS tasks_set_updated_at ON stage5.tasks;
DROP FUNCTION IF EXISTS stage5.set_updated_at();

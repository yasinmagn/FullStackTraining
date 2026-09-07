-- migrate:up
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL,
  display_name  text        NOT NULL,
  -- The HASH, never the password. See src/service/authService.ts.
  password_hash text        NOT NULL,
  role          text        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_email_shape CHECK (email LIKE '%_@_%'),
  CONSTRAINT users_display_name_not_blank CHECK (length(trim(display_name)) > 0)
);

-- Case-insensitive uniqueness. A functional index on lower(email) means
-- 'Ada@example.com' and 'ada@example.com' cannot both exist. This is the check
-- that actually holds under concurrency - two simultaneous registrations can
-- both pass the service's lookup, but only one can pass this.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));

-- migrate:down
DROP TABLE IF EXISTS users;

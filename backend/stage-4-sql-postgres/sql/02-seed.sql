-- =============================================================================
-- Seed data.
--
-- Deterministic ids so the query examples can reference specific rows and the
-- output is the same on every machine.
-- =============================================================================

SET search_path TO stage4;

INSERT INTO users (id, email, display_name) VALUES
  ('11111111-1111-4111-8111-111111111111', 'ada@example.com',    'Ada Lovelace'),
  ('22222222-2222-4222-8222-222222222222', 'grace@example.com',  'Grace Hopper'),
  ('33333333-3333-4333-8333-333333333333', 'alan@example.com',   'Alan Turing'),
  -- A user with no projects and no tasks. Deliberate: it is what makes the
  -- INNER JOIN vs LEFT JOIN difference visible in 03-queries.sql.
  ('44444444-4444-4444-8444-444444444444', 'katherine@example.com', 'Katherine Johnson');

INSERT INTO projects (id, name, owner_id) VALUES
  ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'Platform',  '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', 'Website',   '22222222-2222-4222-8222-222222222222'),
  -- A project with no tasks. Also deliberate - see project_summary.
  ('cccccccc-3333-4333-8333-cccccccccccc', 'Skunkworks','11111111-1111-4111-8111-111111111111');

INSERT INTO tasks (id, project_id, assignee_id, title, description, priority, status, due_date, estimate_hours, completed_at) VALUES
  ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
   'Design the schema', 'Constraints, keys and indexes.', 'high', 'done', '2026-01-10', 6.00, '2026-01-09T17:00:00Z'),

  ('10000000-0000-4000-8000-000000000002', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222',
   'Add indexes for the hot queries', 'Read EXPLAIN ANALYZE first.', 'high', 'in_progress', '2026-02-01', 4.50, NULL),

  ('10000000-0000-4000-8000-000000000003', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', NULL,
   'Write the migration runner', NULL, 'medium', 'todo', '2026-02-15', 8.00, NULL),

  ('10000000-0000-4000-8000-000000000004', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
   'Investigate the N+1 in the task list', 'One query per row is the classic.', 'high', 'todo', '2026-01-20', 3.00, NULL),

  ('10000000-0000-4000-8000-000000000005', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', '33333333-3333-4333-8333-333333333333',
   'Rebuild the marketing pages', NULL, 'medium', 'in_progress', '2026-03-01', 12.00, NULL),

  ('10000000-0000-4000-8000-000000000006', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', '33333333-3333-4333-8333-333333333333',
   'Fix the contact form', 'Validation is client-side only.', 'low', 'done', NULL, 1.50, '2026-01-15T11:30:00Z'),

  ('10000000-0000-4000-8000-000000000007', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', NULL,
   'Audit accessibility', 'Keyboard and screen reader pass.', 'high', 'todo', '2026-02-20', NULL, NULL);

INSERT INTO tags (id, name) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'backend'),
  ('e0000000-0000-4000-8000-000000000002', 'frontend'),
  ('e0000000-0000-4000-8000-000000000003', 'performance'),
  ('e0000000-0000-4000-8000-000000000004', 'accessibility');

INSERT INTO task_tags (task_id, tag_id) VALUES
  ('10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000004'),
  ('10000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000002');

-- =============================================================================
-- Query examples.
--
-- `npm run queries` executes each of these and prints the results, so you can
-- read the SQL and the output side by side. Then open psql and change them.
--
-- Each block is delimited by a `-- name: <label>` comment, which the runner
-- uses to split the file.
-- =============================================================================

-- name: 1. Filtering, ordering and NULL handling
-- NULLS LAST is not the default for ORDER BY ... ASC (nulls sort last for ASC
-- and FIRST for DESC in PostgreSQL). Say what you mean, every time.
SELECT title, priority, due_date, status
FROM stage4.tasks
WHERE status <> 'done'
ORDER BY due_date ASC NULLS LAST, priority DESC
LIMIT 5;

-- name: 2. INNER JOIN vs LEFT JOIN
-- Katherine has no projects. The INNER JOIN drops her; the LEFT JOIN keeps her
-- with a NULL project. This is THE most common source of "why is a row missing
-- from my report".
SELECT
  u.display_name,
  count(p.id) AS project_count
FROM stage4.users u
LEFT JOIN stage4.projects p ON p.owner_id = u.id
GROUP BY u.id, u.display_name
ORDER BY project_count DESC, u.display_name;

-- name: 3. Aggregation with FILTER
-- FILTER is cleaner and faster than count(CASE WHEN ... THEN 1 END), and it is
-- standard SQL. Note coalesce: sum() over zero rows is NULL, not 0.
SELECT
  p.name AS project,
  count(t.id)                                   AS total,
  count(t.id) FILTER (WHERE t.status = 'done')  AS done,
  count(t.id) FILTER (WHERE t.status = 'todo')  AS todo,
  coalesce(sum(t.estimate_hours), 0)            AS total_hours,
  round(
    100.0 * count(t.id) FILTER (WHERE t.status = 'done')
      / nullif(count(t.id), 0),                 -- nullif avoids divide-by-zero
    1
  ) AS percent_done
FROM stage4.projects p
LEFT JOIN stage4.tasks t ON t.project_id = p.id
GROUP BY p.id, p.name
ORDER BY total DESC;

-- name: 4. HAVING filters GROUPS; WHERE filters ROWS
-- WHERE runs before grouping, HAVING after. Putting an aggregate in WHERE is a
-- syntax error; putting a row condition in HAVING is slow and confusing.
SELECT
  u.display_name AS assignee,
  count(*)       AS open_tasks
FROM stage4.tasks t
JOIN stage4.users u ON u.id = t.assignee_id
WHERE t.status <> 'done'          -- rows
GROUP BY u.id, u.display_name
HAVING count(*) >= 1              -- groups
ORDER BY open_tasks DESC, assignee;

-- name: 5. Many-to-many through a join table
-- Two joins to walk tasks -> task_tags -> tags. string_agg collapses the
-- resulting rows back into one line per task.
SELECT
  t.title,
  string_agg(tg.name, ', ' ORDER BY tg.name) AS tags
FROM stage4.tasks t
JOIN stage4.task_tags tt ON tt.task_id = t.id
JOIN stage4.tags tg      ON tg.id = tt.tag_id
GROUP BY t.id, t.title
ORDER BY t.title;

-- name: 6. Solving N+1 with one query
-- The N+1 problem: fetch 100 tasks, then loop and fetch each one's tags = 101
-- queries. A lateral subquery with json aggregation returns everything in ONE
-- round trip, already nested the way the API wants it.
SELECT
  t.title,
  t.status,
  coalesce(tags.names, '[]'::json) AS tags
FROM stage4.tasks t
LEFT JOIN LATERAL (
  SELECT json_agg(tg.name ORDER BY tg.name) AS names
  FROM stage4.task_tags tt
  JOIN stage4.tags tg ON tg.id = tt.tag_id
  WHERE tt.task_id = t.id
) tags ON true
ORDER BY t.title
LIMIT 4;

-- name: 7. Window functions
-- A window function computes across a set of rows WITHOUT collapsing them, so
-- each task keeps its own row while also seeing project-level context.
SELECT
  p.name AS project,
  t.title,
  t.priority,
  row_number() OVER (PARTITION BY p.id ORDER BY t.priority DESC, t.created_at) AS rank_in_project,
  count(*)    OVER (PARTITION BY p.id)                                         AS tasks_in_project
FROM stage4.tasks t
JOIN stage4.projects p ON p.id = t.project_id
ORDER BY p.name, rank_in_project;

-- name: 8. CTE for readability
-- A WITH clause names an intermediate result. Since PostgreSQL 12 a plain CTE
-- is inlined by the planner (no optimisation fence), so you can use it for
-- clarity without paying for it.
WITH open_tasks AS (
  SELECT project_id, estimate_hours
  FROM stage4.tasks
  WHERE status <> 'done'
),
project_load AS (
  SELECT project_id, coalesce(sum(estimate_hours), 0) AS remaining_hours
  FROM open_tasks
  GROUP BY project_id
)
SELECT p.name AS project, l.remaining_hours
FROM project_load l
JOIN stage4.projects p ON p.id = l.project_id
ORDER BY l.remaining_hours DESC;

-- name: 9. Full-text search
-- to_tsvector normalises (stemming, stop words) so 'indexing' matches 'index'.
-- Compare with LIKE '%index%', which cannot use a normal index and matches
-- 'reindexed' but not 'indices'.
SELECT
  title,
  ts_rank(
    to_tsvector('english', title || ' ' || coalesce(description, '')),
    plainto_tsquery('english', 'index')
  ) AS rank
FROM stage4.tasks
WHERE to_tsvector('english', title || ' ' || coalesce(description, ''))
      @@ plainto_tsquery('english', 'index')
ORDER BY rank DESC;

-- name: 10. UPSERT
-- INSERT ... ON CONFLICT is atomic. The alternative - SELECT, then INSERT or
-- UPDATE - has a race between the two statements where a concurrent request
-- inserts the same row and you get a unique violation.
INSERT INTO stage4.tags (name)
VALUES ('backend'), ('database')
ON CONFLICT (name) DO NOTHING
RETURNING id, name;

-- name: 11. RETURNING
-- Get the generated row back in the SAME round trip. No SELECT after the
-- INSERT, and no race where someone changed it in between.
INSERT INTO stage4.tasks (project_id, title, priority, status)
VALUES ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'Learn RETURNING', 'low', 'todo')
RETURNING id, title, created_at;

-- name: 12. The view
SELECT project_name, owner_name, task_count, done_count, remaining_hours
FROM stage4.project_summary
ORDER BY task_count DESC;

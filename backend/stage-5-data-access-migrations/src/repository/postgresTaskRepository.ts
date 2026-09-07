import type { Pool } from 'pg';
import type { Queryable } from '../db/pool.ts';
import { ConflictError, NotFoundError } from '../domain/errors.ts';
import type { ListTasksQuery, Page, Priority, Task, TaskStatus } from '../domain/task.ts';

/**
 * A PostgreSQL implementation of the SAME repository interface Stage 3 defined
 * against an in-memory array.
 *
 * The service layer does not change by a single line. That is the entire
 * payoff of programming against an interface, and it is worth pausing on:
 * everything above this file is unaware that a database now exists.
 */

/** The row shape PostgreSQL returns: snake_case, real Date objects. */
interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * THE MAPPING BOUNDARY.
 *
 * One function, one place. Rename a column and you edit this file and nothing
 * else - as opposed to every component that happened to read `created_at`.
 */
function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    // A DATE column comes back as a Date at local midnight. Formatting it with
    // toISOString() first would shift the day for anyone west of UTC, so we
    // build the calendar date from the local components.
    dueDate: row.due_date === null ? null : formatDate(row.due_date),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Translate PostgreSQL error codes into domain errors.
 *
 * The database is the LAST line of defence, and under concurrency it is the
 * only one that actually holds: two simultaneous requests can both pass the
 * service's uniqueness check, and only one can pass the unique index. So the
 * 23505 has to become a proper 409 rather than a 500.
 *
 * Branch on `code`, never on the message.
 */
function translateError(error: unknown): never {
  const code = (error as { code?: string }).code;
  const constraint = (error as { constraint?: string }).constraint;

  if (code === '23505') {
    if (constraint === 'tasks_title_lower_key') {
      throw new ConflictError('A task with that title already exists', { title: 'must be unique' });
    }
    throw new ConflictError('That value is already taken');
  }
  if (code === '23503') throw new ConflictError('A referenced record does not exist');
  if (code === '23514') throw new ConflictError('A database constraint rejected that value');

  throw error;
}

/**
 * SORTING: an explicit allow-list.
 *
 * Column names CANNOT be parameterised - `ORDER BY $1` sorts by a constant
 * string, not by that column. So sorting is the one place a query is built by
 * concatenation, and therefore the one place SQL injection can creep in.
 *
 * The defence is a lookup table keyed by a validated enum. The client's string
 * never reaches the SQL; it only ever selects a key here.
 */
const SORT_COLUMNS = {
  createdAt: 'created_at',
  dueDate: 'due_date',
  title: 'lower(title)',
  // Sort by meaning, not alphabetically: 'high' < 'low' < 'medium' as text.
  priority: `CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`,
} as const satisfies Record<ListTasksQuery['sort'], string>;

export interface TaskRepository {
  list(query: ListTasksQuery, db?: Queryable): Promise<Page<Task>>;
  findById(id: string, db?: Queryable): Promise<Task | null>;
  findByTitle(title: string, db?: Queryable): Promise<Task | null>;
  create(input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, db?: Queryable): Promise<Task>;
  update(id: string, changes: Partial<Task>, db?: Queryable): Promise<Task | null>;
  delete(id: string, db?: Queryable): Promise<boolean>;
}

export function createPostgresTaskRepository(pool: Pool): TaskRepository {
  /*
   * Every method takes an optional `db`.
   *
   * Called without it, the query auto-commits through the pool. Called WITH a
   * transaction client, it joins that transaction. One method serves both,
   * instead of `create` and `createInTransaction` sitting side by side and
   * slowly diverging.
   */
  const q = (db?: Queryable): Queryable => db ?? pool;

  return {
    async list(query, db) {
      const where: string[] = [];
      const params: unknown[] = [];

      /*
       * PARAMETERISED QUERIES. This is the whole SQL-injection defence.
       *
       *   ✗  `WHERE title = '${query.q}'`
       *      -> input `'; DROP TABLE tasks; --` and it is not your database
       *         any more
       *
       *   ✓  `WHERE title = $1` with the value passed separately
       *
       * The value never becomes part of the SQL TEXT. The server parses the
       * query first and binds the value afterwards, so there is no parse step
       * left for the input to escape into. This is not escaping - it is a
       * different mechanism, and it is why it cannot be got subtly wrong.
       */
      if (query.status) {
        params.push(query.status);
        where.push(`status = $${params.length}`);
      }
      if (query.priority) {
        params.push(query.priority);
        where.push(`priority = $${params.length}`);
      }
      if (query.q) {
        // ILIKE is case-insensitive LIKE. The wildcards are added to the VALUE,
        // not the SQL, so they are still safely parameterised.
        params.push(`%${query.q}%`);
        where.push(`title ILIKE $${params.length}`);
      }

      const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
      const orderSql = `ORDER BY ${SORT_COLUMNS[query.sort]} ${query.order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST, id`;

      const limitIndex = params.length + 1;
      const offsetIndex = params.length + 2;

      /*
       * ONE query for the page AND the total, using a window function.
       *
       * The obvious alternative is two queries - a COUNT and a SELECT - which
       * doubles the round trips and can disagree with itself if a row is
       * inserted between them.
       *
       * `count(*) OVER ()` computes the count across the whole filtered result
       * set, before LIMIT is applied, and attaches it to every row.
       */
      const { rows } = await q(db).query<TaskRow & { total: number }>(
        `SELECT *, count(*) OVER () AS total
         FROM tasks
         ${whereSql}
         ${orderSql}
         LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        [...params, query.pageSize, (query.page - 1) * query.pageSize],
      );

      // Zero rows means zero total - the window function had nothing to report.
      const total = rows[0]?.total ?? 0;

      return {
        data: rows.map(toTask),
        meta: {
          total,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
      };
    },

    async findById(id, db) {
      /*
       * An invalid UUID makes PostgreSQL throw 22P02 (invalid_text_representation),
       * which would surface as a 500. "Not a valid id" and "no such id" are the
       * same thing to a client, so check the shape first and return null.
       */
      if (!isUuid(id)) return null;

      const { rows } = await q(db).query<TaskRow>('SELECT * FROM tasks WHERE id = $1', [id]);
      return rows[0] ? toTask(rows[0]) : null;
    },

    async findByTitle(title, db) {
      const { rows } = await q(db).query<TaskRow>(
        'SELECT * FROM tasks WHERE lower(title) = lower($1)',
        [title.trim()],
      );
      return rows[0] ? toTask(rows[0]) : null;
    },

    async create(input, db) {
      try {
        // RETURNING * gets the created row - with database-generated id and
        // timestamps - in the SAME round trip. No follow-up SELECT, and no
        // window where someone else changed it.
        const { rows } = await q(db).query<TaskRow>(
          `INSERT INTO tasks (title, description, priority, status, due_date)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [input.title, input.description, input.priority, input.status, input.dueDate],
        );
        return toTask(rows[0]!);
      } catch (error) {
        translateError(error);
      }
    },

    async update(id, changes, db) {
      if (!isUuid(id)) return null;

      /*
       * A DYNAMIC UPDATE, built safely.
       *
       * Only the fields actually present are included, so a PATCH cannot
       * accidentally null out a column it never mentioned. The column NAMES
       * come from a fixed map in this file; only the VALUES are parameterised
       * user input.
       */
      const columns: Record<string, keyof Task> = {
        title: 'title',
        description: 'description',
        priority: 'priority',
        status: 'status',
        due_date: 'dueDate',
      };

      const assignments: string[] = [];
      const params: unknown[] = [];

      for (const [column, field] of Object.entries(columns)) {
        if (changes[field] !== undefined) {
          params.push(changes[field]);
          assignments.push(`${column} = $${params.length}`);
        }
      }

      if (assignments.length === 0) return this.findById(id, db);

      params.push(id);

      try {
        // updated_at is NOT set here - the trigger from migration 003 does it,
        // which means a manual UPDATE from psql gets it right too.
        const { rows } = await q(db).query<TaskRow>(
          `UPDATE tasks SET ${assignments.join(', ')} WHERE id = $${params.length} RETURNING *`,
          params,
        );
        return rows[0] ? toTask(rows[0]) : null;
      } catch (error) {
        translateError(error);
      }
    },

    async delete(id, db) {
      if (!isUuid(id)) return false;

      const result = await q(db).query('DELETE FROM tasks WHERE id = $1', [id]);
      // rowCount tells you whether anything actually matched - the difference
      // between "deleted" and "there was nothing to delete".
      return (result.rowCount ?? 0) > 0;
    },
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export { NotFoundError };

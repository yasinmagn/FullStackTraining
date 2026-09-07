import type { Pool } from 'pg';
import type { Queryable } from '../db/pool.ts';
import { ConflictError, type ListTasksQuery, type Page, type Priority, type Task, type TaskStatus } from '../domain/index.ts';

interface TaskRow {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

/** The row -> domain boundary, in one place. Rename a column, edit one file. */
function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    // A DATE arrives as a Date at LOCAL midnight; toISOString() would shift the
    // day backwards for anyone west of UTC.
    dueDate: row.due_date === null ? null : formatDate(row.due_date),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
  };
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Column names cannot be parameterised, so sorting is the one place SQL is
 * built by concatenation - and therefore the one place injection could creep
 * in. The client's string only ever selects a KEY here; it never reaches the
 * SQL. zod's enum already guaranteed it is one of four values.
 */
const SORT_COLUMNS = {
  createdAt: 'created_at',
  dueDate: 'due_date',
  title: 'lower(title)',
  // Sort by meaning: as text, 'high' < 'low' < 'medium'.
  priority: `CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`,
} as const satisfies Record<ListTasksQuery['sort'], string>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string) => UUID_RE.test(value);

function translateError(error: unknown): never {
  const code = (error as { code?: string }).code;
  const constraint = (error as { constraint?: string }).constraint;

  // Under concurrency the unique index is the ONLY check that holds: two
  // simultaneous requests can both pass the service's lookup. So 23505 must
  // become a 409, not a 500.
  if (code === '23505' && constraint === 'tasks_owner_title_lower_key') {
    throw new ConflictError('You already have a task with that title', { title: 'must be unique' });
  }
  if (code === '23505') throw new ConflictError('That value is already taken');
  if (code === '23514') throw new ConflictError('A database constraint rejected that value');
  throw error;
}

export interface TaskRepository {
  /** Every read is scoped by ownerId - there is no unscoped variant to misuse. */
  listForOwner(ownerId: string, query: ListTasksQuery, db?: Queryable): Promise<Page<Task>>;
  findByIdForOwner(id: string, ownerId: string, db?: Queryable): Promise<Task | null>;
  create(input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, db?: Queryable): Promise<Task>;
  update(id: string, ownerId: string, changes: Partial<Task>, db?: Queryable): Promise<Task | null>;
  delete(id: string, ownerId: string, db?: Queryable): Promise<boolean>;
  countForOwner(ownerId: string, db?: Queryable): Promise<{ total: number; done: number }>;
}

export function createTaskRepository(pool: Pool): TaskRepository {
  // Every method takes an optional `db`, so the same method works standalone
  // or inside a transaction. Otherwise you end up with `create` and
  // `createInTransaction` side by side, slowly diverging.
  const q = (db?: Queryable): Queryable => db ?? pool;

  return {
    /**
     * ACCESS CONTROL BY QUERY SCOPING.
     *
     * `owner_id = $1` is baked into the SQL, so this cannot return someone
     * else's task. There is no check to forget and none for a future editor to
     * remove by accident. Compare with fetch-then-check, which relies on
     * everyone remembering.
     */
    async listForOwner(ownerId, query, db) {
      const where = ['owner_id = $1'];
      const params: unknown[] = [ownerId];

      if (query.status) {
        params.push(query.status);
        where.push(`status = $${params.length}`);
      }
      if (query.priority) {
        params.push(query.priority);
        where.push(`priority = $${params.length}`);
      }
      if (query.q) {
        // Wildcards go on the VALUE, so the term is still parameterised.
        params.push(`%${query.q}%`);
        where.push(`title ILIKE $${params.length}`);
      }

      const limitIndex = params.length + 1;
      const offsetIndex = params.length + 2;

      // count(*) OVER () gives the pre-LIMIT total in the SAME query: one round
      // trip, and no chance of a separate COUNT disagreeing with the page.
      const { rows } = await q(db).query<TaskRow & { total: number }>(
        `SELECT *, count(*) OVER () AS total
         FROM tasks
         WHERE ${where.join(' AND ')}
         ORDER BY ${SORT_COLUMNS[query.sort]} ${query.order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST, id
         LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        [...params, query.pageSize, (query.page - 1) * query.pageSize],
      );

      // With zero rows the window function has nothing to attach a count to.
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

    async findByIdForOwner(id, ownerId, db) {
      // A malformed uuid would raise 22P02 and surface as a 500. To a client,
      // "not a valid id" and "no such id" are the same thing.
      if (!isUuid(id)) return null;

      const { rows } = await q(db).query<TaskRow>(
        'SELECT * FROM tasks WHERE id = $1 AND owner_id = $2',
        [id, ownerId],
      );
      return rows[0] ? toTask(rows[0]) : null;
    },

    async create(input, db) {
      try {
        const { rows } = await q(db).query<TaskRow>(
          `INSERT INTO tasks (owner_id, title, description, priority, status, due_date, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            input.ownerId,
            input.title,
            input.description,
            input.priority,
            input.status,
            input.dueDate,
            input.completedAt,
          ],
        );
        return toTask(rows[0]!);
      } catch (error) {
        translateError(error);
      }
    },

    async update(id, ownerId, changes, db) {
      if (!isUuid(id)) return null;

      // Only the fields actually present are included, so a PATCH cannot null
      // out a column it never mentioned. Column NAMES come from this fixed map;
      // only VALUES are user input.
      const columns: Record<string, keyof Task> = {
        title: 'title',
        description: 'description',
        priority: 'priority',
        status: 'status',
        due_date: 'dueDate',
        completed_at: 'completedAt',
      };

      const assignments: string[] = [];
      const params: unknown[] = [];

      for (const [column, field] of Object.entries(columns)) {
        if (changes[field] !== undefined) {
          params.push(changes[field]);
          assignments.push(`${column} = $${params.length}`);
        }
      }

      if (assignments.length === 0) return this.findByIdForOwner(id, ownerId, db);

      params.push(id, ownerId);

      try {
        // The owner_id clause is part of the WHERE, so a user cannot update
        // another user's task even by guessing an id. updated_at is left to the
        // trigger.
        const { rows } = await q(db).query<TaskRow>(
          `UPDATE tasks SET ${assignments.join(', ')}
           WHERE id = $${params.length - 1} AND owner_id = $${params.length}
           RETURNING *`,
          params,
        );
        return rows[0] ? toTask(rows[0]) : null;
      } catch (error) {
        translateError(error);
      }
    },

    async delete(id, ownerId, db) {
      if (!isUuid(id)) return false;

      const result = await q(db).query('DELETE FROM tasks WHERE id = $1 AND owner_id = $2', [id, ownerId]);
      // rowCount distinguishes "deleted" from "there was nothing to delete".
      return (result.rowCount ?? 0) > 0;
    },

    async countForOwner(ownerId, db) {
      const { rows } = await q(db).query<{ total: number; done: number }>(
        `SELECT count(*) AS total,
                count(*) FILTER (WHERE status = 'done') AS done
         FROM tasks WHERE owner_id = $1`,
        [ownerId],
      );
      return rows[0] ?? { total: 0, done: 0 };
    },
  };
}

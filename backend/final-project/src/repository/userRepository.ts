import type { Pool } from 'pg';
import type { Queryable } from '../db/pool.ts';
import { ConflictError, type Role, type UserWithPassword } from '../domain/index.ts';

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  role: Role;
  created_at: Date;
}

function toUser(row: UserRow): UserWithPassword {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at.toISOString(),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UserRepository {
  findByEmail(email: string, db?: Queryable): Promise<UserWithPassword | null>;
  findById(id: string, db?: Queryable): Promise<UserWithPassword | null>;
  create(input: Omit<UserWithPassword, 'id' | 'createdAt'>, db?: Queryable): Promise<UserWithPassword>;
}

export function createUserRepository(pool: Pool): UserRepository {
  const q = (db?: Queryable): Queryable => db ?? pool;

  return {
    async findByEmail(email, db) {
      // lower() on both sides matches the functional unique index, so this
      // lookup uses the index rather than scanning.
      const { rows } = await q(db).query<UserRow>(
        'SELECT * FROM users WHERE lower(email) = lower($1)',
        [email.trim()],
      );
      return rows[0] ? toUser(rows[0]) : null;
    },

    async findById(id, db) {
      if (!UUID_RE.test(id)) return null;
      const { rows } = await q(db).query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
      return rows[0] ? toUser(rows[0]) : null;
    },

    async create(input, db) {
      try {
        const { rows } = await q(db).query<UserRow>(
          `INSERT INTO users (email, display_name, password_hash, role)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [input.email.trim().toLowerCase(), input.displayName, input.passwordHash, input.role],
        );
        return toUser(rows[0]!);
      } catch (error) {
        // 23505 on users_email_lower_key: two simultaneous registrations both
        // passed the service's lookup; only one passed the index.
        if ((error as { code?: string }).code === '23505') {
          throw new ConflictError('An account with that email already exists', {
            email: 'already registered',
          });
        }
        throw error;
      }
    },
  };
}

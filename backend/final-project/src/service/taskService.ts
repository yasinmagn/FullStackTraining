import {
  ConflictError,
  NotFoundError,
  canTransitionTo,
  completedAtFor,
  type CreateTaskInput,
  type ListTasksQuery,
  type Page,
  type Task,
  type UpdateTaskInput,
} from '../domain/index.ts';
import type { TaskRepository } from '../repository/taskRepository.ts';

/**
 * THE SERVICE LAYER.
 *
 * Business rules live here. It imports no express, no pg and no zod - input
 * arrives already parsed, and the repository is an interface.
 *
 * Every method takes `ownerId` as its FIRST argument. That is deliberate: it is
 * impossible to write a method here that forgets to scope by owner, because the
 * parameter would be unused and the compiler would say so.
 */
export interface TaskService {
  list(ownerId: string, query: ListTasksQuery): Promise<Page<Task>>;
  getById(ownerId: string, id: string): Promise<Task>;
  create(ownerId: string, input: CreateTaskInput): Promise<Task>;
  update(ownerId: string, id: string, changes: UpdateTaskInput): Promise<Task>;
  delete(ownerId: string, id: string): Promise<void>;
  stats(ownerId: string): Promise<{ total: number; done: number; open: number; percentDone: number }>;
}

export function createTaskService(repository: TaskRepository): TaskService {
  return {
    async list(ownerId, query) {
      return repository.listForOwner(ownerId, query);
    },

    /**
     * `get*` throws where `find*` returns null.
     *
     * Callers never need a null check, and the 404 is produced in exactly one
     * place. Note that a task belonging to someone else is indistinguishable
     * from one that does not exist - which is the point. A 403 would confirm
     * the id is real and let an attacker enumerate.
     */
    async getById(ownerId, id) {
      const task = await repository.findByIdForOwner(id, ownerId);
      if (!task) throw new NotFoundError('Task', id);
      return task;
    },

    async create(ownerId, input) {
      return repository.create({
        ownerId, // from the caller's session, never from the request body
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: 'todo', // the server decides the initial status
        dueDate: input.dueDate,
        completedAt: null,
      });
    },

    async update(ownerId, id, changes) {
      // 404 for a missing OR someone else's task, handled once above.
      const existing = await this.getById(ownerId, id);

      if (changes.status && !canTransitionTo(existing.status, changes.status)) {
        throw new ConflictError(`Cannot move a task from ${existing.status} to ${changes.status}`, {
          status: 'invalid transition',
        });
      }

      /*
       * `completedAt` is DERIVED from status, never accepted from the client.
       *
       * The database has a CHECK constraint enforcing the same pairing, so if
       * this logic were ever wrong the write would be rejected rather than
       * silently storing an inconsistent row.
       */
      const nextStatus = changes.status ?? existing.status;
      const completedAt = completedAtFor(nextStatus, existing.completedAt);

      const updated = await repository.update(id, ownerId, { ...changes, completedAt });

      // Defensive: another request could have deleted it between the read and
      // the write.
      if (!updated) throw new NotFoundError('Task', id);
      return updated;
    },

    async delete(ownerId, id) {
      const deleted = await repository.delete(id, ownerId);
      if (!deleted) throw new NotFoundError('Task', id);
    },

    async stats(ownerId) {
      const { total, done } = await repository.countForOwner(ownerId);
      return {
        total,
        done,
        open: total - done,
        // Guard the divide: 0/0 is NaN, and NaN renders as "NaN%".
        percentDone: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    },
  };
}

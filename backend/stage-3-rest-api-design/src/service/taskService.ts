import { ConflictError, NotFoundError } from '../domain/errors.ts';
import { canTransitionTo, type CreateTaskInput, type ListTasksQuery, type Page, type Task, type UpdateTaskInput } from '../domain/task.ts';
import type { TaskRepository } from '../repository/taskRepository.ts';

/**
 * THE SERVICE LAYER.
 *
 * This is where BUSINESS RULES live. It is the layer people most often skip -
 * putting the logic in route handlers instead - and the one they most often
 * regret skipping, because rules in a route handler are unreachable from a CLI,
 * a scheduled job or a message consumer.
 *
 * Look at what it does NOT import:
 *   - no `express`      -> no req, no res, no status codes
 *   - no `pg`           -> it takes a TaskRepository interface
 *   - no `zod`          -> input is already parsed by the time it arrives
 *
 * Everything it needs is passed in. That is dependency injection, and it is why
 * `taskService.test.ts` needs no HTTP server and no database.
 */
export interface TaskService {
  list(query: ListTasksQuery): Promise<Page<Task>>;
  getById(id: string): Promise<Task>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: string, changes: UpdateTaskInput): Promise<Task>;
  delete(id: string): Promise<void>;
}

export function createTaskService(repository: TaskRepository): TaskService {
  return {
    async list(query) {
      return repository.list(query);
    },

    /**
     * `getById` THROWS when the task is missing, while `repository.findById`
     * returns null.
     *
     * That difference is deliberate and worth internalising:
     *   - `find*` on a repository means "it may not be there" -> null
     *   - `get*` on a service means "it must be there" -> throw
     *
     * Callers of `getById` then never need a null check, and the 404 is
     * produced in exactly one place.
     */
    async getById(id) {
      const task = await repository.findById(id);
      if (!task) throw new NotFoundError('Task', id);
      return task;
    },

    async create(input) {
      // A business rule, not a schema rule. zod can check that a title is a
      // string of the right length; only the service can know whether that
      // title is already taken, because that requires the data.
      const duplicate = await repository.findByTitle(input.title);
      if (duplicate) {
        throw new ConflictError('A task with that title already exists', {
          title: 'must be unique',
        });
      }

      return repository.create({
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate,
        status: 'todo', // the server decides the initial status, not the client
      });
    },

    async update(id, changes) {
      const existing = await this.getById(id); // 404 handled once, above

      if (changes.status && !canTransitionTo(existing.status, changes.status)) {
        throw new ConflictError(
          `Cannot move a task from ${existing.status} to ${changes.status}`,
          { status: 'invalid transition' },
        );
      }

      if (changes.title && changes.title !== existing.title) {
        const duplicate = await repository.findByTitle(changes.title);
        // `duplicate.id !== id` matters: renaming a task to its own current
        // title (a no-op PATCH) must not be reported as a conflict.
        if (duplicate && duplicate.id !== id) {
          throw new ConflictError('A task with that title already exists', {
            title: 'must be unique',
          });
        }
      }

      const updated = await repository.update(id, changes);
      // Defensive: another caller could have deleted it between the read and
      // the write. Stage 5 shows how a transaction closes that window properly.
      if (!updated) throw new NotFoundError('Task', id);
      return updated;
    },

    async delete(id) {
      const deleted = await repository.delete(id);
      if (!deleted) throw new NotFoundError('Task', id);
    },
  };
}

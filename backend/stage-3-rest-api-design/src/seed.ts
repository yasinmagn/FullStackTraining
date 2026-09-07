import { randomUUID } from 'node:crypto';
import type { Task } from './domain/task.ts';

/** Fixed sample data so the API is not empty on first run. */
export function seedTasks(): Task[] {
  const base = Date.parse('2026-01-01T09:00:00.000Z');
  const at = (days: number) => new Date(base + days * 86_400_000).toISOString();

  return [
    { id: randomUUID(), title: 'Design the resource model', description: 'Nouns, not verbs.', priority: 'high', status: 'done', dueDate: '2026-01-05', createdAt: at(0), updatedAt: at(1) },
    { id: randomUUID(), title: 'Validate every input', description: null, priority: 'high', status: 'in_progress', dueDate: '2026-01-12', createdAt: at(1), updatedAt: at(2) },
    { id: randomUUID(), title: 'Add pagination', description: 'With a hard maximum page size.', priority: 'medium', status: 'todo', dueDate: null, createdAt: at(2), updatedAt: at(2) },
    { id: randomUUID(), title: 'Return consistent errors', description: null, priority: 'medium', status: 'todo', dueDate: '2026-02-01', createdAt: at(3), updatedAt: at(3) },
    { id: randomUUID(), title: 'Write the service tests', description: null, priority: 'low', status: 'todo', dueDate: null, createdAt: at(4), updatedAt: at(4) },
  ];
}

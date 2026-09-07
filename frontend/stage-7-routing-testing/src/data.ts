/**
 * A tiny in-memory data source. Stage 6 covered fetching properly; this stage
 * is about ROUTING and TESTING, so the data layer stays deliberately boring.
 */

export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
}

export const TASKS: Task[] = [
  { id: '1', title: 'Set up routing', description: 'Nested layouts and an outlet.', priority: 'high', status: 'done' },
  { id: '2', title: 'Write a component test', description: 'Query by role, not by class.', priority: 'high', status: 'in_progress' },
  { id: '3', title: 'Handle the 404 route', description: 'A catch-all beats a blank page.', priority: 'medium', status: 'todo' },
  { id: '4', title: 'Put filters in the URL', description: 'So a filtered view can be shared.', priority: 'low', status: 'todo' },
];

/** Simulates a request so tests have something asynchronous to await. */
export async function fetchTasks(status: TaskStatus | 'all' = 'all'): Promise<Task[]> {
  await new Promise((resolve) => setTimeout(resolve, 10));
  return status === 'all' ? TASKS : TASKS.filter((task) => task.status === status);
}

export async function fetchTask(id: string): Promise<Task> {
  await new Promise((resolve) => setTimeout(resolve, 10));
  const task = TASKS.find((candidate) => candidate.id === id);
  if (!task) throw new Response('Task not found', { status: 404 });
  return task;
}

let nextId = TASKS.length + 1;

/** Append a task. In-memory, because this stage is not about persistence. */
export async function addTask(title: string): Promise<Task> {
  await new Promise((resolve) => setTimeout(resolve, 10));

  if (TASKS.some((task) => task.title.toLowerCase() === title.toLowerCase())) {
    throw new Error('A task with that title already exists');
  }

  const task: Task = {
    id: String(nextId++),
    title,
    description: 'Added from the Quick add form.',
    priority: 'medium',
    status: 'todo',
  };
  TASKS.push(task);
  return task;
}

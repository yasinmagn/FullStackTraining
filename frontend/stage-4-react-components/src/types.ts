/**
 * The domain, carried forward from Stage 3.
 *
 * Keeping types in their own module (rather than beside a component) means the
 * shape of your data does not depend on which component happened to need it
 * first.
 */

export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly priority: Priority;
  readonly status: TaskStatus;
  readonly dueDate: string | null;
}

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
} as const satisfies Record<Priority, string>;

export const STATUS_LABELS = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
} as const satisfies Record<TaskStatus, string>;

/** Fixed sample data. Stage 6 replaces this with a real API call. */
export const SAMPLE_TASKS: readonly Task[] = [
  {
    id: 'a1',
    title: 'Read the Stage 4 lesson',
    description: 'Components, props, composition.',
    priority: 'medium',
    status: 'done',
    dueDate: '2026-01-10',
  },
  {
    id: 'a2',
    title: 'Split App into components',
    description: null,
    priority: 'high',
    status: 'in_progress',
    dueDate: '2026-01-12',
  },
  {
    id: 'a3',
    title: 'Understand why keys matter',
    description: 'Try the index-as-key experiment in the lesson.',
    priority: 'high',
    status: 'todo',
    dueDate: null,
  },
  {
    id: 'a4',
    title: 'Skim the React docs on composition',
    description: null,
    priority: 'low',
    status: 'todo',
    dueDate: null,
  },
];

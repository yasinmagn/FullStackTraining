export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type StatusFilter = 'all' | TaskStatus;
export type SortKey = 'created' | 'priority' | 'title';

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly priority: Priority;
  readonly status: TaskStatus;
  readonly createdAt: number;
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

/**
 * The ONLY state we keep.
 *
 * Notice what is NOT here: no `filteredTasks`, no `taskCount`, no
 * `hasCompletedTasks`, no `visibleTaskIds`. Every one of those is a function of
 * the fields below, and storing it would be a second copy that can drift.
 *
 * `query`, `statusFilter` and `sortKey` ARE state: nothing else in the app can
 * tell you what the user typed or clicked.
 */
export interface TasksState {
  readonly tasks: readonly Task[];
  readonly query: string;
  readonly statusFilter: StatusFilter;
  readonly sortKey: SortKey;
  /** The id currently being renamed inline, or null. UI state, still state. */
  readonly editingId: string | null;
}

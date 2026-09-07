import { useTasksState } from '../tasks/TasksProvider.tsx';
import { selectIsFiltered, selectVisibleTasks } from '../tasks/taskReducer.ts';
import { TaskRow } from './TaskRow.tsx';

export function TaskList() {
  const state = useTasksState();

  /*
   * Derived on every render, and that is fine.
   *
   * There is no `useMemo` here on purpose. Filtering and sorting a few dozen
   * items costs microseconds - far less than the memo's own bookkeeping and
   * far less than the render it feeds. Reach for `useMemo` when a profiler
   * says to, not on principle.
   */
  const visible = selectVisibleTasks(state);

  if (visible.length === 0) {
    return (
      <p className="empty">
        {selectIsFiltered(state) ? 'No tasks match these filters.' : 'No tasks yet. Add one above.'}
      </p>
    );
  }

  return (
    <ul className="task-list">
      {visible.map((task) => (
        <TaskRow key={task.id} task={task} isEditing={state.editingId === task.id} />
      ))}
    </ul>
  );
}

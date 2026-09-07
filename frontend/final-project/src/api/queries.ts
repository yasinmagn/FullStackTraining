import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type Task, type TaskPage, type TaskStatus } from './client.ts';

/**
 * Query keys, hierarchical so a whole subtree can be invalidated at once.
 *
 * The TOKEN is part of the key. That is not an oversight - it means logging in
 * as a different user cannot show you the previous user's cached tasks, which
 * is a genuine data-leak bug in apps that key only on filters.
 */
export const taskKeys = {
  all: (token: string) => ['tasks', token] as const,
  lists: (token: string) => [...taskKeys.all(token), 'list'] as const,
  list: (token: string, params: TaskListParams) => [...taskKeys.lists(token), params] as const,
  stats: (token: string) => [...taskKeys.all(token), 'stats'] as const,
};

export interface TaskListParams {
  status?: TaskStatus | 'all';
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: 'createdAt' | 'dueDate' | 'priority' | 'title';
  order?: 'asc' | 'desc';
}

/**
 * Do not retry a client error - a 400 or 404 will still be one on attempt four.
 *
 * The parameter is typed `ApiError`, not `unknown`, and that matters: TanStack
 * infers a query's error type from the options you pass, so annotating this as
 * `unknown` silently widens `query.error` to `unknown` everywhere and
 * `query.error.message` stops compiling - for a reason that has nothing to do
 * with errors. Let the registered error type (src/types/react-query.d.ts) flow
 * through.
 */
const retryPolicy = (failureCount: number, error: ApiError) => {
  if (error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
};

export function taskListQuery(token: string, params: TaskListParams) {
  return queryOptions({
    queryKey: taskKeys.list(token, params),
    queryFn: () => api.listTasks(token, { ...params }),
    // Fresh for 15s: served from cache with no request. Beyond that, served
    // instantly AND refetched in the background.
    staleTime: 15_000,
    retry: retryPolicy,
    // Keep the previous page on screen while the next loads, instead of the
    // list vanishing and the scroll position jumping. `keepPreviousData` is the
    // exported helper for exactly this.
    placeholderData: keepPreviousData,
  });
}

export function taskStatsQuery(token: string) {
  return queryOptions({
    queryKey: taskKeys.stats(token),
    queryFn: () => api.stats(token),
    staleTime: 15_000,
    retry: retryPolicy,
  });
}

export function useCreateTask(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { title: string; description: string | null; priority: string; dueDate: string | null }) =>
      api.createTask(token, input),
    onSuccess: () => {
      /*
       * INVALIDATE rather than writing the new task into the cache by hand.
       *
       * The server may have changed it (trimming, defaults, generated
       * timestamps), and the list has a sort order the client would otherwise
       * have to reimplement. `taskKeys.all` is a prefix, so both the lists and
       * the stats refetch.
       */
      void queryClient.invalidateQueries({ queryKey: taskKeys.all(token) });
    },
  });
}

/**
 * OPTIMISTIC STATUS TOGGLE.
 *
 * Ticking a checkbox should feel instant, so update the cache first, fire the
 * request, and roll back if it fails.
 */
export function useUpdateTaskStatus(token: string, params: TaskListParams) {
  const queryClient = useQueryClient();
  const listKey = taskKeys.list(token, params);

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api.updateTask(token, id, { status }),

    onMutate: async ({ id, status }) => {
      /*
       * Cancel in-flight refetches FIRST. Without this, a refetch that started
       * before the optimistic write can land after it and overwrite the guess
       * with stale server data. This is the step everyone skips.
       */
      await queryClient.cancelQueries({ queryKey: listKey });

      const previous = queryClient.getQueryData<TaskPage>(listKey);

      queryClient.setQueryData<TaskPage>(listKey, (current) =>
        current === undefined
          ? current
          : {
              ...current,
              data: current.data.map((task) =>
                task.id === id
                  ? {
                      ...task,
                      status,
                      // Mirror the server's derived field so the UI does not
                      // flicker when the real response arrives.
                      completedAt: status === 'done' ? (task.completedAt ?? new Date().toISOString()) : null,
                    }
                  : task,
              ),
            },
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },

    onSettled: () => {
      // Success or failure, the server has the last word. The optimistic value
      // was only ever a guess.
      void queryClient.invalidateQueries({ queryKey: taskKeys.all(token) });
    },
  });
}

/**
 * OPTIMISTIC DELETE.
 *
 * Note that restoring on failure has to put the row back AT ITS ORIGINAL INDEX,
 * which is why the whole previous page is snapshotted rather than just the task.
 */
export function useDeleteTask(token: string, params: TaskListParams) {
  const queryClient = useQueryClient();
  const listKey = taskKeys.list(token, params);

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(token, id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<TaskPage>(listKey);

      queryClient.setQueryData<TaskPage>(listKey, (current) =>
        current === undefined
          ? current
          : {
              ...current,
              data: current.data.filter((task: Task) => task.id !== id),
              meta: { ...current.meta, total: Math.max(0, current.meta.total - 1) },
            },
      );

      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all(token) });
    },
  });
}

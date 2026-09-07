import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { ApiError, fakeApi, type ListParams } from './fakeServer.ts';
import type { CreateTaskInput, Task, TaskList, TaskStatus } from './schemas.ts';

/**
 * QUERY KEYS.
 *
 * A key identifies a cache entry. Two rules and you will never fight the cache:
 *
 *   1. Everything the fetch function reads must appear in the key. Miss a
 *      filter and you will serve one filter's data under another's key.
 *   2. Structure keys hierarchically, so you can invalidate a whole subtree:
 *
 *        ['tasks']                          -> everything task-related
 *        ['tasks', 'list']                  -> every list, any filter
 *        ['tasks', 'list', { status: 'todo' }] -> one specific list
 *
 * A factory object keeps them in one place. Typos in a string literal are
 * silent cache misses - the most annoying class of bug in this library.
 */
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (params: ListParams) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

/**
 * `queryOptions` ties a key to its fetcher and infers the data type, so every
 * call site agrees. Defining this once beats repeating `queryKey`/`queryFn`
 * pairs in components.
 */
export function taskListQuery(params: ListParams) {
  return queryOptions({
    queryKey: taskKeys.list(params),
    queryFn: () => fakeApi.listTasks(params),

    /**
     * staleTime: how long data is considered FRESH.
     *
     * Fresh data is served from cache with no network request at all. Stale
     * data is still served instantly, then refetched in the background.
     *
     * The default is 0 - every mount refetches. That is safe but chatty. Pick a
     * value from how fast the data actually changes: seconds for a live feed,
     * minutes for a task list, hours for a country dropdown.
     */
    staleTime: 30_000,

    /**
     * Do not retry a client error. A 404 will still be a 404 on the fourth
     * attempt; retrying it just delays the error message the user needs.
     */
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false;
      return failureCount < 2;
    },

    /**
     * Keep showing the PREVIOUS page's data while the next one loads, instead
     * of flashing a spinner. `isPlaceholderData` tells the UI to dim it.
     */
    placeholderData: (previous: TaskList | undefined) => previous,
  });
}

/** Create a task, then invalidate every list so they refetch. */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => fakeApi.createTask(input),
    onSuccess: () => {
      /*
       * INVALIDATION is the normal way to keep the cache honest after a write.
       *
       * `['tasks', 'list']` is a PREFIX match, so every list - whatever its
       * filters - is marked stale and refetched if it is on screen. You do not
       * have to know which filters happen to be active.
       *
       * Why not write the new task into the cache by hand? Because the server
       * may have changed it (defaults, trimming, computed fields), and because
       * a list has a sort order the client would have to reimplement.
       */
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * OPTIMISTIC UPDATE.
 *
 * Toggling a checkbox should feel instant. So: update the cache immediately,
 * fire the request, and roll back if it fails.
 *
 * The four callbacks form a strict contract - get one wrong and you have a UI
 * that lies about what was saved:
 *
 *   onMutate   - cancel in-flight refetches, snapshot, apply the guess
 *   onError    - restore the snapshot
 *   onSettled  - invalidate, so the server has the last word either way
 */
export function useUpdateTaskStatus(params: ListParams) {
  const queryClient = useQueryClient();
  const listKey = taskKeys.list(params);

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      fakeApi.updateTaskStatus(id, status),

    onMutate: async ({ id, status }) => {
      /*
       * Cancel outgoing refetches for this key first. Without this, a refetch
       * that started BEFORE the optimistic write can land AFTER it and
       * overwrite the guess with stale server data.
       */
      await queryClient.cancelQueries({ queryKey: listKey });

      const previous = queryClient.getQueryData<TaskList>(listKey);

      queryClient.setQueryData<TaskList>(listKey, (current) =>
        current === undefined
          ? current
          : {
              ...current,
              data: current.data.map((task) => (task.id === id ? { ...task, status } : task)),
            },
      );

      // Whatever is returned here arrives as `context` in onError/onSettled.
      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },

    onSettled: () => {
      // Success or failure, refetch. The server is the source of truth; the
      // optimistic value was only ever a guess.
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fakeApi.deleteTask(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
  });
}

/**
 * Prefetching: warm the cache before the user asks.
 *
 * Call it on hover over a "next page" button and the page appears instantly.
 */
export function prefetchTaskList(queryClient: QueryClient, params: ListParams) {
  return queryClient.prefetchQuery(taskListQuery(params));
}

export type { Task };

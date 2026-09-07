import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider.tsx';
import { routes } from './routes.tsx';
import type { Task } from './api/client.ts';

/**
 * COMPONENT + INTEGRATION TESTS.
 *
 * `fetch` is stubbed at the network boundary rather than mocking our own
 * modules. That means the real API client runs - its error handling, its zod
 * parsing, its header building - and the tests exercise the same code path
 * production does. Mocking `api/client.ts` instead would leave all of that
 * untested.
 */

const TOKEN = 'a-fake-jwt-for-tests';

const task = (over: Partial<Task> = {}): Task => ({
  id: '11111111-1111-4111-8111-111111111111',
  ownerId: 'user-1',
  title: 'Write the final project',
  description: null,
  priority: 'high',
  status: 'todo',
  dueDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  completedAt: null,
  ...over,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Route stubbed requests by method + path. */
function stubFetch(handlers: Record<string, (init: RequestInit | undefined) => Response>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    const handler = handlers[key];
    if (!handler) throw new Error(`Unstubbed request: ${key}`);
    return handler(init);
  });
}

function renderApp(initialPath = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  // A FRESH client per test: sharing one leaks cached data between tests, so
  // order starts to matter and failures vanish in isolation.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
  });

  return {
    user: userEvent.setup(),
    router,
    ...render(
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AuthProvider>,
    ),
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// =============================================================================
describe('authentication', () => {
  it('redirects an anonymous visitor to the login page', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('remembers where the user was heading', async () => {
    const { router } = renderApp('/?status=done');

    await screen.findByRole('heading', { name: 'Sign in' });
    // The intended destination is stashed, so a deep link survives the login
    // detour instead of dumping everyone on the home page.
    expect((router.state.location.state as { from?: string }).from).toBe('/?status=done');
  });

  it('signs in and lands on the task list', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch({
        'POST /auth/login': () =>
          json({
            data: {
              user: { id: 'user-1', email: 'ada@example.com', displayName: 'Ada', role: 'user', createdAt: '2026-01-01T00:00:00.000Z' },
              accessToken: TOKEN,
            },
          }),
        'GET /api/tasks': () => json({ data: [task()], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } }),
        'GET /api/tasks/stats': () => json({ data: { total: 1, done: 0, open: 1, percentDone: 0 } }),
      }),
    );

    const { user } = renderApp('/login');

    await user.type(screen.getByLabelText('Password'), 'demo-password-1234');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Write the final project')).toBeInTheDocument();
    // The token is persisted, so a reload does not sign the user out.
    expect(window.localStorage.getItem('taskmanager:accessToken')).toBe(TOKEN);
  });

  it('shows the server message on a failed sign-in and re-enables the form', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch({
        'POST /auth/login': () =>
          json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }, 401),
      }),
    );

    const { user } = renderApp('/login');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    // The `finally` in the submit handler - without it one failure locks the
    // form forever.
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('reports an unreachable API rather than hanging', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const { user } = renderApp('/login');
    await user.type(screen.getByLabelText('Password'), 'demo-password-1234');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // `fetch` rejects only on network failure, and the client turns that into
    // a message a user can act on.
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not reach the server/);
  });

  it('renders server-side field errors on registration', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch({
        'POST /auth/register': () =>
          json(
            {
              error: {
                code: 'CONFLICT',
                message: 'An account with that email already exists',
                details: { email: 'already registered' },
              },
            },
            409,
          ),
      }),
    );

    const { user } = renderApp('/register');

    await user.type(screen.getByLabelText('Email'), 'taken@example.com');
    await user.type(screen.getByLabelText('Display name'), 'Taken');
    await user.type(screen.getByLabelText(/Password/), 'a-long-enough-password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    // The API's consistent error envelope is what makes this possible: the
    // message lands under the right input.
    const email = screen.getByLabelText('Email');
    await waitFor(() => expect(email).toHaveAccessibleDescription('already registered'));
  });
});

// =============================================================================
describe('task list', () => {
  function signedIn(handlers: Record<string, (init: RequestInit | undefined) => Response>) {
    window.localStorage.setItem('taskmanager:accessToken', TOKEN);
    vi.stubGlobal('fetch', stubFetch(handlers));
  }

  const listOnly = (tasks: Task[], total = tasks.length) => ({
    'GET /api/tasks': () => json({ data: tasks, meta: { total, page: 1, pageSize: 10, totalPages: Math.max(1, Math.ceil(total / 10)) } }),
    'GET /api/tasks/stats': () => json({ data: { total, done: 0, open: total, percentDone: 0 } }),
  });

  it('sends the bearer token', async () => {
    signedIn(listOnly([task()]));
    renderApp('/');

    await screen.findByText('Write the final project');

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const headers = fetchMock.mock.calls[0]![1].headers as Record<string, string>;
    // The Authorization HEADER, never a query parameter - query strings end up
    // in logs, history and Referer headers.
    expect(headers.authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('distinguishes "loaded but empty" from "loading"', async () => {
    signedIn(listOnly([], 0));
    renderApp('/');

    expect(await screen.findByText('No tasks yet. Add one above.')).toBeInTheDocument();
    // The state people forget - conflating them gives a spinner that never ends.
    expect(screen.queryByText('Loading your tasks…')).not.toBeInTheDocument();
  });

  it('shows an error with a retry button when the list fails', async () => {
    signedIn({
      'GET /api/tasks': () => json({ error: { code: 'INTERNAL_ERROR', message: 'Database unavailable' } }, 500),
      'GET /api/tasks/stats': () => json({ data: { total: 0, done: 0, open: 0, percentDone: 0 } }),
    });
    renderApp('/');

    /*
     * The longer timeout is deliberate, and worth understanding.
     *
     * `retry: false` on the test QueryClient is only a DEFAULT. `taskListQuery`
     * sets its own `retry` policy, and query-level options WIN - so a 500 is
     * retried twice, with exponential backoff between attempts, before the
     * error surfaces. That is correct production behaviour (a 5xx may be
     * transient); it just takes longer than the 1s default.
     *
     * The alternative - deleting the retry policy to make the test fast -
     * would be testing a configuration nobody runs.
     */
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      'Database unavailable',
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('reads the initial filter from the URL', async () => {
    signedIn(listOnly([task({ status: 'done', title: 'Finished thing' })]));
    renderApp('/?status=done');

    await screen.findByText('Finished thing');
    // The URL is state: bookmarkable, shareable, survives a refresh.
    expect(screen.getByLabelText('Status')).toHaveValue('done');
  });

  it('writes a filter change back to the URL without losing the others', async () => {
    signedIn(listOnly([task()]));
    const { user, router } = renderApp('/?sort=priority');

    await screen.findByText('Write the final project');
    await user.selectOptions(screen.getByLabelText('Status'), 'todo');

    // The classic setSearchParams bug is wiping the params you did not touch.
    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('status')).toBe('todo');
      expect(params.get('sort')).toBe('priority');
    });
  });

  it('shows server-computed stats, not a count of the current page', async () => {
    window.localStorage.setItem('taskmanager:accessToken', TOKEN);
    vi.stubGlobal(
      'fetch',
      stubFetch({
        'GET /api/tasks': () =>
          json({ data: [task()], meta: { total: 47, page: 1, pageSize: 10, totalPages: 5 } }),
        // The page holds 1 task; the user has 47. Counting locally would lie.
        'GET /api/tasks/stats': () => json({ data: { total: 47, done: 12, open: 35, percentDone: 26 } }),
      }),
    );
    renderApp('/');

    expect(await screen.findByText(/12 of 47 done \(26%\)/)).toBeInTheDocument();
  });
});

// =============================================================================
describe('creating a task', () => {
  it('validates on the client before sending anything', async () => {
    window.localStorage.setItem('taskmanager:accessToken', TOKEN);
    const fetchMock = stubFetch({
      'GET /api/tasks': () => json({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 1 } }),
      'GET /api/tasks/stats': () => json({ data: { total: 0, done: 0, open: 0, percentDone: 0 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { user } = renderApp('/');
    await screen.findByLabelText('Title');

    await user.type(screen.getByLabelText('Title'), 'ab');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('Title must be at least 3 characters')).toBeInTheDocument();
    // No POST was attempted.
    expect(fetchMock.mock.calls.every(([, init]) => (init?.method ?? 'GET') !== 'POST')).toBe(true);
  });

  it('sends a valid task and clears the form', async () => {
    window.localStorage.setItem('taskmanager:accessToken', TOKEN);
    let created = false;
    vi.stubGlobal(
      'fetch',
      stubFetch({
        'GET /api/tasks': () =>
          json({
            data: created ? [task({ title: 'A brand new task' })] : [],
            meta: { total: created ? 1 : 0, page: 1, pageSize: 10, totalPages: 1 },
          }),
        'GET /api/tasks/stats': () => json({ data: { total: 0, done: 0, open: 0, percentDone: 0 } }),
        'POST /api/tasks': () => {
          created = true;
          return json({ data: task({ title: 'A brand new task' }) }, 201);
        },
      }),
    );

    const { user } = renderApp('/');
    await screen.findByLabelText('Title');

    await user.type(screen.getByLabelText('Title'), 'A brand new task');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    // Invalidation refetches the list, so the new task appears from the server
    // rather than being hand-written into the cache.
    expect(await screen.findByText('A brand new task')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue(''));
  });

  it('shows a server conflict under the title field', async () => {
    window.localStorage.setItem('taskmanager:accessToken', TOKEN);
    vi.stubGlobal(
      'fetch',
      stubFetch({
        'GET /api/tasks': () => json({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 1 } }),
        'GET /api/tasks/stats': () => json({ data: { total: 0, done: 0, open: 0, percentDone: 0 } }),
        'POST /api/tasks': () =>
          json(
            {
              error: {
                code: 'CONFLICT',
                message: 'You already have a task with that title',
                details: { title: 'must be unique' },
              },
            },
            409,
          ),
      }),
    );

    const { user } = renderApp('/');
    await screen.findByLabelText('Title');

    await user.type(screen.getByLabelText('Title'), 'Duplicate title');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    // Client validation is a convenience; the server is the authority, and its
    // errors land in the same place.
    expect(await screen.findByText('must be unique')).toBeInTheDocument();
  });
});

// =============================================================================
describe('optimistic updates', () => {
  it('ticks the checkbox immediately and keeps it when the server agrees', async () => {
    window.localStorage.setItem('taskmanager:accessToken', TOKEN);
    let status: 'todo' | 'done' = 'todo';

    vi.stubGlobal(
      'fetch',
      stubFetch({
        'GET /api/tasks': () =>
          json({ data: [task({ status })], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } }),
        'GET /api/tasks/stats': () => json({ data: { total: 1, done: 0, open: 1, percentDone: 0 } }),
        'PATCH /api/tasks/11111111-1111-4111-8111-111111111111': () => {
          status = 'done';
          return json({ data: task({ status: 'done', completedAt: '2026-01-02T00:00:00.000Z' }) });
        },
      }),
    );

    const { user } = renderApp('/');
    const checkbox = await screen.findByRole('checkbox', { name: /Mark .* as done/ });

    await user.click(checkbox);
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /as not done/ })).toBeChecked());
  });

  it('ROLLS BACK when the server rejects the change', async () => {
    window.localStorage.setItem('taskmanager:accessToken', TOKEN);

    vi.stubGlobal(
      'fetch',
      stubFetch({
        'GET /api/tasks': () =>
          json({ data: [task()], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } }),
        'GET /api/tasks/stats': () => json({ data: { total: 1, done: 0, open: 1, percentDone: 0 } }),
        'PATCH /api/tasks/11111111-1111-4111-8111-111111111111': () =>
          json({ error: { code: 'CONFLICT', message: 'Cannot move a task from done to in_progress' } }, 409),
      }),
    );

    const { user } = renderApp('/');
    const checkbox = await screen.findByRole('checkbox', { name: /Mark .* as done/ });

    await user.click(checkbox);

    // The onError handler restores the snapshot taken in onMutate. Without it,
    // the UI would keep showing a change the server refused.
    expect(await screen.findByText(/rolled back/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /as done/ })).not.toBeChecked());
  });
});

// =============================================================================
describe('accessibility', () => {
  it('every control has an accessible name', async () => {
    window.localStorage.setItem('taskmanager:accessToken', TOKEN);
    vi.stubGlobal(
      'fetch',
      stubFetch({
        'GET /api/tasks': () =>
          json({ data: [task()], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } }),
        'GET /api/tasks/stats': () => json({ data: { total: 1, done: 0, open: 1, percentDone: 0 } }),
      }),
    );
    renderApp('/');

    await screen.findByText('Write the final project');

    // Querying by role + name IS the accessibility check: if getByRole cannot
    // find it, neither can a screen reader.
    const list = screen.getByRole('list');
    expect(within(list).getByRole('checkbox', { name: /Mark Write the final project as done/ })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Delete Write the final project' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tasks completed' })).toBeInTheDocument();
  });
});

import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../routes.tsx';

/**
 * Test helpers.
 *
 * Almost every component in a real app needs providers - a router, a query
 * client, a theme, an auth context. Writing that boilerplate in each test is
 * how test suites become unmaintainable. Wrap it once.
 */

/**
 * A fresh QueryClient PER TEST.
 *
 * Sharing one between tests leaks cached data across them, so test order starts
 * to matter and you get failures that vanish when run in isolation. This is the
 * single most common cause of flaky React Query tests.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // No retries in tests: a deliberately-failing request would otherwise
        // take three timeouts to report, and your suite would just be slow.
        retry: false,
        // Never serve one test's data to another.
        staleTime: 0,
        gcTime: 0,
      },
      mutations: { retry: false },
    },
  });
}

/**
 * Render the whole app at a given URL.
 *
 * `createMemoryRouter` keeps history in memory instead of touching the address
 * bar, which is what makes routing testable in jsdom. Crucially it uses the SAME
 * `routes` array the app does - a test that declares its own routes is testing
 * a fiction.
 */
export function renderApp(initialPath = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const queryClient = createTestQueryClient();

  return {
    // `userEvent.setup()` must be called BEFORE render. It fires realistic
    // event sequences - a click is pointerdown, mousedown, focus, pointerup,
    // mouseup, click - which is why it catches bugs `fireEvent` misses.
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
    router,
  };
}

/** Render a single component with the providers it needs, but no routing. */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient();

  return {
    user: userEvent.setup(),
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider.tsx';
import { routes } from './routes.tsx';

/**
 * ONE QueryClient, created OUTSIDE the component.
 *
 * Creating it inside would build a new client - and an empty cache - on every
 * render, so everything would refetch constantly.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      // Come back to the tab and your data is current.
      refetchOnWindowFocus: true,
    },
  },
});

const router = createBrowserRouter(routes);

export default function App() {
  return (
    // AuthProvider is OUTSIDE QueryClientProvider on purpose: query keys
    // include the token, so auth has to be resolved before any query runs.
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>
  );
}

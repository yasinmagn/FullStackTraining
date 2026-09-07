import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChaosPanel } from './components/ChaosPanel.tsx';
import { ManualFetchDemo } from './components/ManualFetchDemo.tsx';
import { TaskBrowser } from './components/TaskBrowser.tsx';
import { TaskForm } from './components/TaskForm.tsx';

/**
 * ONE QueryClient for the whole app, created OUTSIDE the component.
 *
 * Creating it inside `App` would build a brand new client - and therefore an
 * empty cache - on every render. Everything would refetch constantly and you
 * would blame the library.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /*
       * Sensible global defaults; individual queries override them.
       *
       * refetchOnWindowFocus is on by default and is genuinely useful - come
       * back to the tab and your data is current. It also surprises people who
       * did not know it existed, so know the switch is there.
       */
      staleTime: 10_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="app">
        <header className="app-header">
          <h1>Task Board</h1>
          <p className="tagline">Stage 6 &middot; server state, forms and optimistic updates</p>
        </header>

        <section className="card">
          <header className="card-header">
            <h2>Chaos controls</h2>
          </header>
          <div className="card-body">
            <ChaosPanel />
            <p className="lab-note">
              Turn failures up and watch retries, rollbacks and error UI. This is the only way to
              exercise the unhappy paths before production does it for you.
            </p>
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <h2>Add a task</h2>
          </header>
          <div className="card-body">
            <TaskForm />
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <h2>Browse (TanStack Query)</h2>
          </header>
          <div className="card-body">
            <TaskBrowser />
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <h2>Fetching by hand: the race condition</h2>
          </header>
          <div className="card-body">
            <ManualFetchDemo />
          </div>
        </section>
      </main>
    </QueryClientProvider>
  );
}

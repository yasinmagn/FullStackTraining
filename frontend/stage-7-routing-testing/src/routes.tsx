import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RootLayout } from './routes/RootLayout.tsx';
import { TasksPage } from './routes/TasksPage.tsx';
import { TaskDetailPage } from './routes/TaskDetailPage.tsx';
import { NotFoundPage } from './routes/NotFoundPage.tsx';

/**
 * CODE SPLITTING.
 *
 * `lazy()` + a dynamic `import()` means this route's JavaScript is a separate
 * chunk, downloaded only when someone visits /about. On a real app this is the
 * difference between a 2MB first load and a 200KB one.
 *
 * `<Suspense>` supplies what to show while the chunk downloads.
 */
const AboutPage = lazy(() =>
  import('./routes/AboutPage.tsx').then((module) => ({ default: module.AboutPage })),
);

/**
 * The route table lives in its own module so tests can build a router from the
 * same definitions the app uses. If a test declares its own routes it is
 * testing a fiction.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    /*
     * A route-level error boundary. Anything that throws below here renders
     * this instead of unmounting the app and leaving a white page.
     */
    errorElement: <NotFoundPage />,
    children: [
      // An INDEX route: what renders at the parent's own path ("/").
      { index: true, element: <TasksPage /> },

      // A dynamic segment. `:taskId` is read with useParams().
      { path: 'tasks/:taskId', element: <TaskDetailPage /> },

      {
        path: 'about',
        element: (
          <Suspense fallback={<p className="empty">Loading page...</p>}>
            <AboutPage />
          </Suspense>
        ),
      },

      // The catch-all. Without it an unknown URL renders nothing at all.
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

import type { RouteObject } from 'react-router-dom';
import { AppLayout, ProtectedRoute, PublicOnlyRoute } from './routes/AppLayout.tsx';
import { TasksPage } from './routes/TasksPage.tsx';
import { LoginPage } from './routes/LoginPage.tsx';
import { RegisterPage } from './routes/RegisterPage.tsx';
import { NotFoundPage } from './routes/NotFoundPage.tsx';

/**
 * The route table lives in its own module so tests can build a memory router
 * from the SAME definitions the app uses. A test that declares its own routes
 * is testing a fiction.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [{ index: true, element: <TasksPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

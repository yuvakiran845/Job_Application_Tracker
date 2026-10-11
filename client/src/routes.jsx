import { GuestOnly, RequireAuth } from './components/auth/RouteGuards';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import ApplicationDetailsPage from './pages/ApplicationDetailsPage';
import ApplicationsPage from './pages/ApplicationsPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import RouteErrorPage from './pages/RouteErrorPage';

// Shared by the browser router (main.jsx) and the memory router used in tests.
export const routes = [
  {
    // Sign-in pages: only for signed-out visitors.
    element: <GuestOnly />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage />, handle: { title: 'Sign in' } },
          { path: '/register', element: <RegisterPage />, handle: { title: 'Create account' } },
        ],
      },
    ],
  },
  {
    // Everything else requires a signed-in user.
    path: '/',
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage />, handle: { title: 'Dashboard' } },
          { path: 'applications', element: <ApplicationsPage />, handle: { title: 'Applications' } },
          {
            path: 'applications/:applicationId',
            element: <ApplicationDetailsPage />,
            handle: { title: 'Application details' },
          },
          { path: '*', element: <NotFoundPage />, handle: { title: 'Page not found' } },
        ],
      },
    ],
  },
];

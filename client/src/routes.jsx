import { GuestOnly, RequireAuth } from './components/auth/RouteGuards';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import AccountPage from './pages/AccountPage';
import ApplicationDetailsPage from './pages/ApplicationDetailsPage';
import ApplicationsPage from './pages/ApplicationsPage';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import PipelinePage from './pages/PipelinePage';
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
          { path: 'pipeline', element: <PipelinePage />, handle: { title: 'Pipeline' } },
          { path: 'calendar', element: <CalendarPage />, handle: { title: 'Calendar' } },
          {
            path: 'analytics',
            // Loaded on demand so the charting library isn't part of the main bundle.
            lazy: async () => ({ Component: (await import('./pages/AnalyticsPage')).default }),
            handle: { title: 'Analytics' },
          },
          { path: 'account', element: <AccountPage />, handle: { title: 'Account' } },
          { path: '*', element: <NotFoundPage />, handle: { title: 'Page not found' } },
        ],
      },
    ],
  },
];

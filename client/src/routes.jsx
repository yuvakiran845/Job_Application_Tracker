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
          {
            index: true,
            element: <DashboardPage />,
            handle: { title: 'Dashboard', greeting: true, description: 'Here’s your job search overview.' },
          },
          {
            path: 'applications',
            element: <ApplicationsPage />,
            handle: { title: 'My Applications', description: 'Every role you’re tracking, with search, filters and export.' },
          },
          {
            path: 'applications/:applicationId',
            element: <ApplicationDetailsPage />,
            handle: { title: 'Application details', description: 'Everything about this application in one place.' },
          },
          {
            path: 'pipeline',
            element: <PipelinePage />,
            handle: { title: 'Pipeline', description: 'Every application by stage. Move them along as things progress.' },
          },
          {
            path: 'calendar',
            element: <CalendarPage />,
            handle: { title: 'Calendar', description: 'Interviews and deadlines, in your time zone.' },
          },
          {
            path: 'analytics',
            // Loaded on demand so the charting library isn't part of the main bundle.
            lazy: async () => ({ Component: (await import('./pages/AnalyticsPage')).default }),
            handle: { title: 'Analytics', description: 'How your job search is going, by the numbers.' },
          },
          {
            path: 'account',
            element: <AccountPage />,
            handle: { title: 'Account', description: 'Your profile and sign-in details.' },
          },
          { path: '*', element: <NotFoundPage />, handle: { title: 'Page not found' } },
        ],
      },
    ],
  },
];

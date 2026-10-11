import { AppLayout } from './layouts/AppLayout';
import ApplicationDetailsPage from './pages/ApplicationDetailsPage';
import ApplicationsPage from './pages/ApplicationsPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import RouteErrorPage from './pages/RouteErrorPage';

// Shared by the browser router (main.jsx) and the memory router used in tests.
export const routes = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
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
];

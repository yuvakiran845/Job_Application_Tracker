import { RouterProvider } from 'react-router';
import { ApplicationsProvider } from './context/ApplicationsProvider';
import { ToastProvider } from './context/ToastProvider';

export default function App({ router }) {
  return (
    <ToastProvider>
      <ApplicationsProvider>
        <RouterProvider router={router} />
      </ApplicationsProvider>
    </ToastProvider>
  );
}

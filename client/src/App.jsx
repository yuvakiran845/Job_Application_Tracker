import { RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider } from './context/ToastProvider';

/** `authService` and `authEnabled` are only passed by tests; the app uses the defaults. */
export default function App({ router, authService, authEnabled }) {
  return (
    <ToastProvider>
      <AuthProvider service={authService} enabled={authEnabled}>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}

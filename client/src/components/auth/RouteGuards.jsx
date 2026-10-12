import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getSafeRedirect } from '../../utils/authValidation';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

function FullPageStatus({ children }) {
  return <div className="grid min-h-dvh place-items-center bg-slate-50 p-4">{children}</div>;
}

function AuthStatusScreen() {
  const { status, error, retry } = useAuth();

  if (status === 'error') {
    return (
      <FullPageStatus>
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xs">
          <EmptyState
            icon={TriangleAlert}
            title="My Job Trackr can’t start right now"
            description={error?.message || 'Please try again in a moment.'}
            action={
              <Button icon={RotateCcw} onClick={retry}>
                Try again
              </Button>
            }
          />
        </div>
      </FullPageStatus>
    );
  }

  return (
    <FullPageStatus>
      <p role="status" className="flex items-center gap-2 text-sm text-slate-600">
        <LoaderCircle className="size-5 animate-spin text-brand-600" aria-hidden="true" />
        Loading My Job Trackr…
      </p>
    </FullPageStatus>
  );
}

/** Renders child routes only for signed-in users; others go to /login and come back afterwards. */
export function RequireAuth() {
  const { status, reason } = useAuth();
  const location = useLocation();

  if (status === 'loading' || status === 'error') return <AuthStatusScreen />;
  if (status === 'unauthenticated') {
    // Come back to this page after signing in — except after an explicit sign-out,
    // so the next person using this browser doesn't land on the previous user's page.
    const next = `${location.pathname}${location.search}`;
    const search = next === '/' || reason === 'signed-out' ? '' : `?next=${encodeURIComponent(next)}`;
    return <Navigate to={`/login${search}`} replace state={{ reason }} />;
  }
  return <Outlet />;
}

/** Sign-in and sign-up pages: signed-in users are sent on to the app. */
export function GuestOnly() {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'loading' || status === 'error') return <AuthStatusScreen />;
  if (status === 'authenticated') return <Navigate to={getSafeRedirect(searchParams.get('next'))} replace />;
  return <Outlet />;
}

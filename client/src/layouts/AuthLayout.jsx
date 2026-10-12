import { Outlet } from 'react-router';
import { APP_NAME, LogoMark } from '../components/layout/Logo';
import { usePageTitle } from '../hooks/usePageTitle';

/** Centered card layout for sign-in and sign-up. */
export function AuthLayout() {
  usePageTitle();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900">
        <LogoMark className="size-10" />
        {APP_NAME}
      </div>
      <main className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 sm:p-8">
        <Outlet />
      </main>
      <p className="mt-6 max-w-sm text-center text-sm text-slate-500">
        Track every application, interview and deadline in one place.
      </p>
    </div>
  );
}

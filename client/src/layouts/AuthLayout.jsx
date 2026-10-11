import { Outlet } from 'react-router';
import { LogoMark } from '../components/layout/Logo';
import { usePageTitle } from '../hooks/usePageTitle';

/** Centered card layout for sign-in and sign-up. */
export function AuthLayout() {
  usePageTitle();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5 text-lg font-semibold tracking-tight text-slate-900">
        <LogoMark />
        CareerFlow
      </div>
      <main className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <Outlet />
      </main>
      <p className="mt-6 max-w-sm text-center text-xs text-slate-500">
        Track every application, interview and deadline in one place.
      </p>
    </div>
  );
}

import { useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { FlaskConical } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { MobileNav } from '../components/layout/MobileNav';
import { PageHeader } from '../components/layout/PageHeader';
import { Alert } from '../components/ui/Alert';
import { IS_MOCK_DATA } from '../config';
import { ApplicationActionsProvider } from '../context/ApplicationActionsProvider';

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <ApplicationActionsProvider>
      <div className="min-h-dvh bg-slate-50">
        <a
          href="#main-content"
          className="sr-only rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>

        <AppHeader mobileNavOpen={mobileNavOpen} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

        <main id="main-content" tabIndex={-1} className="focus:outline-hidden">
          <PageHeader />
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {IS_MOCK_DATA && (
              <Alert icon={FlaskConical} className="mb-6">
                <span className="font-medium text-slate-900">Development preview.</span> You’re viewing sample data.
                Changes are kept in memory and reset when you reload the page.
              </Alert>
            )}
            <Outlet />
          </div>
        </main>

        <ScrollRestoration />
      </div>
    </ApplicationActionsProvider>
  );
}

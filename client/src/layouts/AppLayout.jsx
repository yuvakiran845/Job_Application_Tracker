import { useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { Database, FlaskConical } from 'lucide-react';
import { MobileNav } from '../components/layout/MobileNav';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { Alert } from '../components/ui/Alert';
import { IS_MOCK_DATA } from '../config';
import { ApplicationActionsProvider } from '../context/ApplicationActionsProvider';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePersistentState } from '../hooks/usePersistentState';
import { cn } from '../utils/format';

export function AppLayout() {
  const title = usePageTitle();
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState('careerflow:sidebar-collapsed', false);
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

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white transition-[width] duration-200 lg:block',
            sidebarCollapsed ? 'w-[72px]' : 'w-64',
          )}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
          />
        </aside>

        <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

        <div className={cn('transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
          <Topbar title={title} mobileNavOpen={mobileNavOpen} onOpenMobileNav={() => setMobileNavOpen(true)} />

          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-7xl px-4 py-6 focus:outline-hidden sm:px-6 lg:px-8 lg:py-8"
          >
            {IS_MOCK_DATA ? (
              <Alert icon={FlaskConical} className="mb-6">
                <span className="font-medium text-slate-900">Development preview.</span> You’re viewing sample data.
                Changes are kept in memory and reset when you reload the page.
              </Alert>
            ) : (
              <Alert icon={Database} className="mb-6">
                <span className="font-medium text-slate-900">Development mode.</span> Changes are saved to the
                CareerFlow database for a shared development user. Personal accounts and sign-in are coming soon.
              </Alert>
            )}
            <Outlet />
          </main>
        </div>

        <ScrollRestoration />
      </div>
    </ApplicationActionsProvider>
  );
}

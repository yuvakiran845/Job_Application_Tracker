import { useAuth } from '../../hooks/useAuth';
import { usePageMeta, usePageTitle } from '../../hooks/usePageTitle';

function getFirstName(user) {
  return user?.name?.trim().split(/\s+/)[0] ?? '';
}

/**
 * The white band under the top bar with the page's heading (the only h1) and a
 * one-line description, both from the route's `handle`. The dashboard greets the
 * user instead (`handle.greeting`).
 */
export function PageHeader() {
  usePageTitle();
  const { title, description, greeting } = usePageMeta();
  const { user, enabled: authEnabled } = useAuth();
  const firstName = authEnabled ? getFirstName(user) : '';

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {greeting ? (
            <>
              Welcome back{firstName && `, ${firstName}`}!{' '}
              <span aria-hidden="true" className="inline-block">
                👋
              </span>
            </>
          ) : (
            title
          )}
        </h1>
        {description && <p className="mt-1.5 text-base text-slate-600">{description}</p>}
      </div>
    </div>
  );
}

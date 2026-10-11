import { NavLink } from 'react-router';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '../../utils/format';
import { Logo } from './Logo';
import { PRIMARY_NAV, UPCOMING_NAV } from './navigation';

function Tooltip({ label }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  );
}

/**
 * Navigation content shared by the desktop sidebar and the mobile drawer.
 * `collapsed` shows icons only (desktop); `onNavigate` lets the drawer close itself.
 */
export function Sidebar({ collapsed = false, onToggleCollapse, onNavigate, headerAction }) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-slate-200',
          collapsed ? 'justify-center px-2' : 'justify-between px-5',
        )}
      >
        <Logo collapsed={collapsed} onNavigate={onNavigate} />
        {headerAction}
      </div>

      <nav aria-label="Main" className={cn('flex-1 px-3 py-4', !collapsed && 'overflow-y-auto')}>
        <ul className="space-y-1">
          {PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group relative flex h-9 items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                    collapsed ? 'justify-center' : 'px-3',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className={cn(collapsed && 'sr-only')}>{label}</span>
                {collapsed && <Tooltip label={label} />}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <p
            className={cn(
              'px-3 text-xs font-medium tracking-wide text-slate-500 uppercase',
              collapsed && 'sr-only',
            )}
          >
            Coming soon
          </p>
          <ul className={cn('space-y-1', !collapsed && 'mt-2')}>
            {UPCOMING_NAV.map(({ label, icon: Icon }) => (
              <li key={label}>
                <span
                  className={cn(
                    'group relative flex h-9 cursor-not-allowed items-center gap-3 rounded-lg text-sm font-medium text-slate-500',
                    collapsed ? 'justify-center' : 'px-3',
                  )}
                >
                  <Icon className="size-[18px] shrink-0 opacity-70" aria-hidden="true" />
                  <span className={cn(collapsed && 'sr-only')}>{label}</span>
                  {collapsed ? (
                    <>
                      <span className="sr-only"> (coming soon)</span>
                      <Tooltip label={`${label} · coming soon`} />
                    </>
                  ) : (
                    <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] leading-none font-medium text-slate-500">
                      Soon
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {onToggleCollapse && (
        <div className="shrink-0 border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'group relative flex h-9 w-full cursor-pointer items-center gap-3 rounded-lg text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900',
              collapsed ? 'justify-center' : 'px-3',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-[18px]" aria-hidden="true" />
            )}
            {!collapsed && <span>Collapse</span>}
            {collapsed && <Tooltip label="Expand sidebar" />}
          </button>
        </div>
      )}
    </div>
  );
}

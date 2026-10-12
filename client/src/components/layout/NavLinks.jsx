import { NavLink } from 'react-router';
import { cn } from '../../utils/format';
import { PRIMARY_NAV } from './navigation';

/**
 * The main navigation links, laid out in a row (top bar) or a column (mobile drawer).
 * `onNavigate` lets the drawer close itself after a link is followed.
 */
export function NavLinks({ orientation = 'horizontal', onNavigate }) {
  const horizontal = orientation === 'horizontal';
  return (
    <ul className={cn(horizontal ? 'flex items-center gap-1' : 'space-y-1')}>
      {PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors',
                horizontal ? 'h-10 px-3 text-sm' : 'h-11 px-3 text-[15px]',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            {/* In the top bar the icons appear once there's room for them. */}
            <Icon className={cn('size-[18px] shrink-0', horizontal && 'hidden xl:block')} aria-hidden="true" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

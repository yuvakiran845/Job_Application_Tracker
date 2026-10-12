import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/format';

const ICON_TILE_TONES = {
  brand: 'bg-brand-600',
  success: 'bg-emerald-600',
  violet: 'bg-violet-600',
  warning: 'bg-amber-600',
};

export function Card({ as: Component = 'section', className, children, ...props }) {
  return (
    <Component
      className={cn('overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

/** Card title row. An `icon` adds a coloured tile beside a larger title (dashboard style). */
export function CardHeader({ title, titleId, description, action, icon: Icon, iconTone = 'brand', className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap justify-between gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5',
        Icon ? 'items-center' : 'items-start',
        className,
      )}
    >
      <div className={cn('min-w-0', Icon && 'flex items-center gap-3')}>
        {Icon && (
          <span
            className={cn('grid size-10 shrink-0 place-items-center rounded-xl text-white', ICON_TILE_TONES[iconTone])}
            aria-hidden="true"
          >
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 id={titleId} className={cn('font-semibold text-slate-900', Icon ? 'text-lg' : 'text-base')}>
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** "View All →" link for a card header. `what` completes the name for screen readers. */
export function ViewAllLink({ to, what }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
    >
      View All <span className="sr-only">{what}</span>
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

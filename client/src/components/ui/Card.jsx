import { cn } from '../../utils/format';

export function Card({ as: Component = 'section', className, children, ...props }) {
  return (
    <Component
      className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ title, titleId, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-4 sm:px-5',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 id={titleId} className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

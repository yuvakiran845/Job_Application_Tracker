import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { cn } from '../../utils/format';

const VARIANTS = {
  info: { icon: Info, classes: 'border-brand-100 bg-brand-50/60 text-slate-700', iconClass: 'text-brand-600' },
  success: { icon: CircleCheck, classes: 'border-emerald-200 bg-emerald-50 text-emerald-900', iconClass: 'text-emerald-600' },
  error: { icon: CircleAlert, classes: 'border-rose-200 bg-rose-50 text-rose-900', iconClass: 'text-rose-600' },
};

export function Alert({ variant = 'info', title, icon, action, className, children, ...props }) {
  const { icon: DefaultIcon, classes, iconClass } = VARIANTS[variant];
  const Icon = icon ?? DefaultIcon;

  return (
    <div className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', classes, className)} {...props}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

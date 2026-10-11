import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cn } from '../../utils/format';

const VARIANTS = {
  success: { icon: CircleCheck, iconClass: 'text-emerald-600' },
  error: { icon: CircleAlert, iconClass: 'text-rose-600' },
  info: { icon: Info, iconClass: 'text-brand-600' },
};

export function Toaster({ toasts, onDismiss }) {
  return (
    // The live region stays mounted so screen readers announce toasts as they are added.
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
    >
      {toasts.map(({ id, title, description, variant }) => {
        const { icon: Icon, iconClass } = VARIANTS[variant] ?? VARIANTS.info;
        return (
          <div
            key={id}
            role={variant === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg motion-safe:animate-toast-in"
          >
            <Icon className={cn('mt-0.5 size-5 shrink-0', iconClass)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              {description && <p className="mt-0.5 text-sm break-words text-slate-600">{description}</p>}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(id)}
              className="-m-1 cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Dismiss notification"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

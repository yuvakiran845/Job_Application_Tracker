import { useId } from 'react';
import { cn } from '../../utils/format';
import { Skeleton } from '../ui/Skeleton';

const ICON_TONES = {
  brand: 'bg-brand-50 text-brand-600',
  violet: 'bg-violet-50 text-violet-600',
  success: 'bg-emerald-50 text-emerald-600',
  danger: 'bg-rose-50 text-rose-600',
};

const CARD_CLASSES = 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6';

/** One headline number. `trend="up"` shows the footnote as good news (green). */
export function StatCard({ label, value, footnote, icon: Icon, tone = 'brand', trend }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className={CARD_CLASSES}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id={labelId} className="text-sm font-medium text-slate-600">
            {label}
          </p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-4xl">{value}</p>
        </div>
        <span className={cn('hidden size-12 shrink-0 place-items-center rounded-xl min-[400px]:grid', ICON_TONES[tone])}>
          <Icon className="size-6" aria-hidden="true" />
        </span>
      </div>
      {footnote && (
        <p className={cn('mt-3 text-sm sm:mt-4', trend === 'up' ? 'font-medium text-emerald-700' : 'text-slate-500')}>
          {footnote}
        </p>
      )}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className={CARD_CLASSES} aria-hidden="true">
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-9 w-14" />
        </div>
        <Skeleton className="hidden size-12 rounded-xl min-[400px]:block" />
      </div>
      <Skeleton className="mt-4 h-4 w-32" />
    </div>
  );
}

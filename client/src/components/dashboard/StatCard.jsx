import { useId } from 'react';
import { cn } from '../../utils/format';
import { Skeleton } from '../ui/Skeleton';

const ICON_TONES = {
  brand: 'bg-brand-50 text-brand-600',
  violet: 'bg-violet-50 text-violet-600',
  success: 'bg-emerald-50 text-emerald-600',
  danger: 'bg-rose-50 text-rose-600',
};

const CARD_CLASSES = 'rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5';

export function StatCard({ label, value, footnote, icon: Icon, tone = 'brand' }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className={CARD_CLASSES}>
      <div className="flex items-start justify-between gap-3">
        <p id={labelId} className="text-sm font-medium text-slate-600">
          {label}
        </p>
        <span className={cn('hidden size-9 shrink-0 place-items-center rounded-lg min-[400px]:grid', ICON_TONES[tone])}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{footnote}</p>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className={CARD_CLASSES} aria-hidden="true">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="hidden size-9 rounded-lg min-[400px]:block" />
      </div>
      <Skeleton className="mt-3 h-8 w-14" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

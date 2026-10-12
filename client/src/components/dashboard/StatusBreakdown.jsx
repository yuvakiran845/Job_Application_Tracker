import { useId } from 'react';
import { APPLICATION_STATUSES } from '../../constants/applications';
import { cn } from '../../utils/format';
import { Card, CardHeader } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { getToneStyles } from '../ui/tones';

/** Stacked bar + legend showing how many applications are in each status. */
export function StatusBreakdown({ byStatus, total, loading = false, icon, iconTone }) {
  const titleId = useId();

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        titleId={titleId}
        title="Status breakdown"
        description="Where each of your applications currently stands."
        icon={icon}
        iconTone={iconTone}
      />
      {/* A container query: the legend's columns follow the card's width, which differs
          between the dashboard and the analytics page, rather than the viewport's. */}
      <div className="@container px-4 py-5 sm:px-5">
        {loading ? (
          <div aria-hidden="true">
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="mt-5 grid grid-cols-2 gap-4 @md:grid-cols-4 @3xl:grid-cols-7">
              {APPLICATION_STATUSES.map(({ value }) => (
                <Skeleton key={value} className="h-10" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* The legend below carries the same numbers as text, so the bar is decorative. */}
            <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              {total > 0 &&
                APPLICATION_STATUSES.filter(({ value }) => byStatus[value] > 0).map(({ value, tone }) => (
                  <div
                    key={value}
                    className={cn('h-full', getToneStyles(tone).dot)}
                    style={{ width: `${(byStatus[value] / total) * 100}%` }}
                  />
                ))}
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 @md:grid-cols-4 @3xl:grid-cols-7">
              {APPLICATION_STATUSES.map(({ value, label, tone }) => (
                <li key={value}>
                  <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className={cn('size-2 shrink-0 rounded-full', getToneStyles(tone).dot)} aria-hidden="true" />
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{byStatus[value]}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

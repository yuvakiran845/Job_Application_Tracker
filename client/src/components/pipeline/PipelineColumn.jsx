import { useId } from 'react';
import { Link } from 'react-router';
import { useApplicationsByStatus } from '../../hooks/useApplicationData';
import { cn } from '../../utils/format';
import { LoadErrorAlert } from '../applications/LoadErrorAlert';
import { Skeleton } from '../ui/Skeleton';
import { getToneStyles } from '../ui/tones';
import { PipelineCard } from './PipelineCard';

/** One status column. Accepts dropped cards from other columns. */
export function PipelineColumn({ status, dragging, isDropTarget, onDragStart, onDragEnd, onDragOverColumn, onDropOnColumn }) {
  const titleId = useId();
  const query = useApplicationsByStatus(status.value);
  const items = query.data?.items ?? [];
  const total = query.data?.meta.total ?? 0;
  const canDrop = Boolean(dragging) && dragging.status !== status.value;

  return (
    <section
      aria-labelledby={titleId}
      onDragOver={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        onDragOverColumn(status.value);
      }}
      onDrop={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        onDropOnColumn(status.value);
      }}
      className={cn(
        'flex w-72 shrink-0 snap-start flex-col rounded-xl border bg-slate-100/70 transition-colors',
        isDropTarget ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200',
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className={cn('size-2 rounded-full', getToneStyles(status.tone).dot)} aria-hidden="true" />
          {status.label}
        </h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 tabular-nums">
          {query.isPending ? '…' : total}
          <span className="sr-only"> applications</span>
        </span>
      </header>

      <div className="flex-1 px-2 pb-2">
        {query.isPending ? (
          <div className="space-y-2" aria-hidden="true">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        ) : query.isError ? (
          <LoadErrorAlert error={query.error} onRetry={() => query.refetch()} title="Couldn’t load this column" />
        ) : items.length === 0 ? (
          <p
            className={cn(
              'rounded-lg border border-dashed px-3 py-6 text-center text-xs text-slate-500',
              isDropTarget ? 'border-brand-300' : 'border-slate-300',
            )}
          >
            {canDrop ? `Drop here to move to ${status.label}` : 'No applications'}
          </p>
        ) : (
          <ul className="space-y-2" aria-labelledby={titleId}>
            {items.map((application) => (
              <PipelineCard
                key={application.id}
                application={application}
                dragging={dragging?.id === application.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
          </ul>
        )}
        {total > items.length && !query.isPending && (
          <p className="mt-2 px-1 text-xs text-slate-600">
            Showing {items.length} of {total}.{' '}
            <Link to={`/applications?status=${status.value}`} className="font-medium text-brand-700 hover:underline">
              View all
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

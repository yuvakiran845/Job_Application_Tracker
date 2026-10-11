import { useId } from 'react';
import { ArrowRightLeft, PencilLine, Plus } from 'lucide-react';
import { useActivity } from '../../hooks/useApplicationData';
import { describeActivity } from '../../utils/activity';
import { formatDateTime } from '../../utils/date';
import { Card, CardHeader } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { LoadErrorAlert } from './LoadErrorAlert';

const ICONS = { created: Plus, status_changed: ArrowRightLeft, updated: PencilLine };

/** Recorded history for one application. Nothing is shown for changes made before recording began. */
export function ActivityTimeline({ applicationId }) {
  const titleId = useId();
  const query = useActivity(applicationId);

  let content;
  if (query.isPending) {
    content = (
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    );
  } else if (query.isError) {
    content = <LoadErrorAlert error={query.error} onRetry={() => query.refetch()} title="Couldn’t load activity" />;
  } else if (query.data.length === 0) {
    content = (
      <p className="text-sm text-slate-500">
        No activity recorded yet. Status changes and edits you make from now on will appear here.
      </p>
    );
  } else {
    content = (
      <ol className="relative space-y-4 border-l border-slate-200 pl-5">
        {query.data.map((entry) => {
          const Icon = ICONS[entry.type] ?? PencilLine;
          return (
            <li key={entry.id} className="relative">
              <span className="absolute top-0.5 -left-[29px] grid size-4.5 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                <Icon className="size-3" aria-hidden="true" />
              </span>
              <p className="text-sm text-slate-800">{describeActivity(entry)}</p>
              <time dateTime={entry.createdAt} className="text-xs text-slate-500">
                {formatDateTime(entry.createdAt)}
              </time>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader titleId={titleId} title="Activity" />
      <div className="px-4 py-5 sm:px-5">{content}</div>
    </Card>
  );
}

import { ChevronDown } from 'lucide-react';
import { APPLICATION_STATUSES, STATUS_BY_VALUE } from '../../constants/applications';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import { cn } from '../../utils/format';
import { getToneStyles } from '../ui/tones';

/**
 * Status badge that is also a native <select>, so changing status is one click
 * (or keyboard interaction) from any list. Updates optimistically.
 */
export function StatusSelect({ application, className }) {
  const { changeStatus } = useApplicationActions();
  const tone = getToneStyles(STATUS_BY_VALUE[application.status]?.tone);

  return (
    <div className={cn('relative inline-flex', className)}>
      <span
        className={cn('pointer-events-none absolute top-1/2 left-2 size-1.5 -translate-y-1/2 rounded-full', tone.dot)}
        aria-hidden="true"
      />
      <select
        value={application.status}
        onChange={(event) => changeStatus(application, event.target.value)}
        aria-label={`Status for ${application.jobTitle} at ${application.company}`}
        className={cn(
          'h-6 cursor-pointer appearance-none rounded-full py-0 pr-6 pl-5 text-xs font-medium ring-1 ring-inset transition-shadow hover:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
          tone.badge,
        )}
      >
        {APPLICATION_STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 opacity-70"
        aria-hidden="true"
      />
    </div>
  );
}

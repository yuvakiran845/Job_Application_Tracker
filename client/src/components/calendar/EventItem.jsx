import { Link } from 'react-router';
import { CalendarClock, Flag } from 'lucide-react';
import { STATUS_BY_VALUE } from '../../constants/applications';
import { describeDeadline } from '../../utils/calendar';
import { cn } from '../../utils/format';
import { Badge } from '../ui/Badge';

function formatTime(iso, locale) {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

/** One interview or deadline, linking to its application. */
export function EventItem({ event, returnTo = '/calendar' }) {
  const { application } = event;
  const status = STATUS_BY_VALUE[application.status];
  const isInterview = event.type === 'interview';
  const Icon = isInterview ? CalendarClock : Flag;

  return (
    <li className="flex items-start gap-3 py-3">
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg',
          isInterview ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-700',
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">
          {isInterview ? (
            <>
              <time dateTime={event.at}>{formatTime(event.at)}</time> · Interview
            </>
          ) : (
            describeDeadline(application.status)
          )}
        </p>
        <Link
          to={`/applications/${application.id}`}
          state={{ returnTo }}
          className="block truncate text-sm text-slate-600 hover:text-brand-700 hover:underline"
        >
          {application.jobTitle} at {application.company}
        </Link>
      </div>
      {status && (
        <Badge tone={status.tone} dot className="mt-0.5">
          {status.label}
        </Badge>
      )}
    </li>
  );
}

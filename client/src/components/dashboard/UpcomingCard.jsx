import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useEvents } from '../../hooks/useApplicationData';
import { getEventDay, sortEvents, toEventRange } from '../../utils/calendar';
import { addDays, daysBetween, parseISODate, toISODate } from '../../utils/date';
import { LoadErrorAlert } from '../applications/LoadErrorAlert';
import { EventItem } from '../calendar/EventItem';
import { ButtonLink } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const DAYS = 14;
const LIMIT = 5;

function dayLabel(day, today) {
  const offset = daysBetween(today, day);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(parseISODate(day));
}

/** The next few interviews and deadlines (two weeks ahead). */
export function UpcomingCard() {
  const [now] = useState(() => new Date());
  const today = toISODate(now);
  const range = useMemo(() => toEventRange(now, addDays(now, DAYS - 1)), [now]);
  const query = useEvents(range);
  const events = useMemo(
    () => sortEvents((query.data ?? []).filter((event) => getEventDay(event) >= today)).slice(0, LIMIT),
    [query.data, today],
  );

  let content;
  if (query.isPending) {
    content = (
      <div className="space-y-3 py-4" aria-hidden="true">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  } else if (query.isError) {
    content = <LoadErrorAlert error={query.error} onRetry={() => query.refetch()} title="Couldn’t load upcoming events" className="my-4" />;
  } else if (events.length === 0) {
    content = <p className="py-5 text-sm text-slate-500">Nothing scheduled in the next {DAYS} days.</p>;
  } else {
    content = (
      <ul className="divide-y divide-slate-100">
        {events.map((event) => (
          <li key={event.id}>
            <p className="pt-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">{dayLabel(getEventDay(event), today)}</p>
            <ul>
              <EventItem event={event} returnTo="/" />
            </ul>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card aria-labelledby="upcoming-title">
      <CardHeader
        titleId="upcoming-title"
        title="Upcoming"
        description="Interviews and deadlines in the next two weeks."
        action={
          <ButtonLink to="/calendar" variant="ghost" size="sm" className="-mr-2">
            Calendar
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        }
      />
      <div className="px-4 pb-2 sm:px-5">{content}</div>
    </Card>
  );
}

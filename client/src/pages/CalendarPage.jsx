import { useMemo, useRef, useState } from 'react';
import { CalendarX2, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { LoadErrorAlert } from '../components/applications/LoadErrorAlert';
import { EventItem } from '../components/calendar/EventItem';
import { MonthCalendar } from '../components/calendar/MonthCalendar';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useEvents } from '../hooks/useApplicationData';
import { getEventDay, getMonthGrid, getTimeZoneLabel, groupEventsByDay, toEventRange } from '../utils/calendar';
import { addDays, daysBetween, parseISODate, toISODate } from '../utils/date';

const AGENDA_DAYS = 30;

function dayHeading(day, today) {
  const offset = daysBetween(today, day);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(parseISODate(day));
}

function EventList({ events, returnTo }) {
  return (
    <ul className="divide-y divide-slate-100">
      {events.map((event) => (
        <EventItem key={event.id} event={event} returnTo={returnTo} />
      ))}
    </ul>
  );
}

export default function CalendarPage() {
  const [now] = useState(() => new Date());
  const today = toISODate(now);
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today);
  const moveFocusRef = useRef(false);

  const { weeks, gridStart, gridEnd } = useMemo(() => getMonthGrid(month), [month]);
  const monthRange = useMemo(() => toEventRange(gridStart, gridEnd), [gridStart, gridEnd]);
  const agendaRange = useMemo(() => toEventRange(now, addDays(now, AGENDA_DAYS - 1)), [now]);
  const monthQuery = useEvents(monthRange);
  const agendaQuery = useEvents(agendaRange);

  const eventsByDay = useMemo(() => groupEventsByDay(monthQuery.data ?? []), [monthQuery.data]);
  const agendaByDay = useMemo(
    () => groupEventsByDay((agendaQuery.data ?? []).filter((event) => getEventDay(event) >= today)),
    [agendaQuery.data, today],
  );
  const selectedEvents = eventsByDay.get(selectedDay) ?? [];

  function selectDay(date) {
    setSelectedDay(toISODate(date));
    // Selecting a day outside the visible month shows that month.
    if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  function changeMonth(offset) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDay(toISODate(next));
  }

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);

  return (
    <div className="space-y-6">
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <Globe className="size-4 text-slate-400" aria-hidden="true" />
        Interview times are shown in your time zone ({getTimeZoneLabel()}). Deadlines are whole days.
      </p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card aria-labelledby="calendar-month-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 id="calendar-month-title" className="text-base font-semibold text-slate-900" aria-live="polite">
              {monthLabel}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => selectDay(now)}>
                Today
              </Button>
              <Button variant="secondary" size="sm" iconOnly onClick={() => changeMonth(-1)} aria-label="Previous month">
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="secondary" size="sm" iconOnly onClick={() => changeMonth(1)} aria-label="Next month">
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="p-2 sm:p-4">
            {monthQuery.isError && !monthQuery.data ? (
              <LoadErrorAlert error={monthQuery.error} onRetry={() => monthQuery.refetch()} title="We couldn’t load your calendar" />
            ) : (
              <div className={monthQuery.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                <MonthCalendar
                  weeks={weeks}
                  month={month}
                  selectedDay={selectedDay}
                  today={today}
                  eventsByDay={eventsByDay}
                  onSelectDay={selectDay}
                  moveFocusRef={moveFocusRef}
                />
              </div>
            )}
            <p className="mt-3 flex items-center gap-4 px-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-violet-500" aria-hidden="true" /> Interview
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" /> Deadline
              </span>
            </p>
          </div>

          <div className="border-t border-slate-100 px-4 py-4 sm:px-5" aria-live="polite">
            <h3 className="text-sm font-semibold text-slate-900">{dayHeading(selectedDay, today)}</h3>
            {monthQuery.isPending ? (
              <Skeleton className="mt-3 h-10" />
            ) : selectedEvents.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">Nothing scheduled.</p>
            ) : (
              <EventList events={selectedEvents} />
            )}
          </div>
        </Card>

        <Card aria-labelledby="agenda-title">
          <CardHeader
            titleId="agenda-title"
            title="Upcoming"
            description={`Interviews and deadlines in the next ${AGENDA_DAYS} days.`}
          />
          <div className="px-4 pb-2 sm:px-5">
            {agendaQuery.isPending ? (
              <div className="space-y-3 py-4" aria-hidden="true">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : agendaQuery.isError ? (
              <LoadErrorAlert error={agendaQuery.error} onRetry={() => agendaQuery.refetch()} className="my-4" />
            ) : agendaByDay.size === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title="Nothing coming up"
                description="Add interview times and deadlines to your applications to see them here."
                className="px-0 py-8"
              />
            ) : (
              [...agendaByDay.entries()].map(([day, events]) => (
                <section key={day} aria-label={dayHeading(day, today)} className="border-b border-slate-100 py-3 last:border-0">
                  <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{dayHeading(day, today)}</h3>
                  <EventList events={events} />
                </section>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

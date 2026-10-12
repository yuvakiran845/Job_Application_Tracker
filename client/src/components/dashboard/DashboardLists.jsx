import { Link } from 'react-router';
import { CalendarClock, ClipboardList, Clock, Flag, Inbox, Plus } from 'lucide-react';
import { describeDeadline, getEventDay } from '../../utils/calendar';
import { daysBetween, formatDate, formatTimeAgo } from '../../utils/date';
import { LoadErrorAlert } from '../applications/LoadErrorAlert';
import { StatusBadge } from '../applications/StatusBadge';
import { Button } from '../ui/Button';
import { Card, CardHeader, ViewAllLink } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

const ITEM_CLASSES =
  'flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300 sm:gap-4';

function whenLabel(day, today) {
  const days = daysBetween(today, day);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function formatInterviewTime(iso) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Title link that also names the company for screen readers ("Frontend Engineer at Northwind Labs"). */
function ApplicationLink({ application }) {
  return (
    <Link
      to={`/applications/${application.id}`}
      state={{ returnTo: '/' }}
      className="min-w-0 font-semibold break-words text-slate-900 hover:text-brand-700 hover:underline"
    >
      {application.jobTitle} <span className="sr-only">at {application.company}</span>
    </Link>
  );
}

function ListSkeleton({ rows = 2 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

function QuietEmpty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-500" aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-slate-600">{children}</p>
    </div>
  );
}

/** Interviews in the coming days, soonest first. `events` are already filtered to upcoming ones. */
export function UpcomingInterviews({ query, events, today, days }) {
  let content;
  if (query.isPending) content = <ListSkeleton />;
  else if (query.isError) {
    content = <LoadErrorAlert error={query.error} onRetry={() => query.refetch()} title="Couldn’t load interviews" />;
  } else if (events.length === 0) {
    content = (
      <QuietEmpty icon={CalendarClock} title={`No interviews in the next ${days} days`}>
        Add an interview date to an application and it will show up here.
      </QuietEmpty>
    );
  } else {
    content = (
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={event.id} className={ITEM_CLASSES}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600" aria-hidden="true">
              <CalendarClock className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <ApplicationLink application={event.application} />
                <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  {whenLabel(getEventDay(event), today)}
                </span>
              </div>
              <p className="truncate text-sm text-slate-600">{event.application.company}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                <Clock className="size-4 shrink-0" aria-hidden="true" />
                <time dateTime={event.at}>{formatInterviewTime(event.at)}</time>
              </p>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card aria-labelledby="upcoming-interviews-title">
      <CardHeader
        titleId="upcoming-interviews-title"
        title="Upcoming Interviews"
        icon={CalendarClock}
        action={<ViewAllLink to="/calendar" what="in the calendar" />}
      />
      <div className="p-4 sm:p-5">{content}</div>
    </Card>
  );
}

/** Application, assessment and offer-response deadlines in the coming days. */
export function UpcomingDeadlines({ query, events, today, days }) {
  let content;
  if (query.isPending) content = <ListSkeleton />;
  else if (query.isError) {
    content = <LoadErrorAlert error={query.error} onRetry={() => query.refetch()} title="Couldn’t load deadlines" />;
  } else if (events.length === 0) {
    content = (
      <QuietEmpty icon={Flag} title={`No deadlines in the next ${days} days`}>
        Application, assessment and offer deadlines you add will show up here.
      </QuietEmpty>
    );
  } else {
    content = (
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={event.id} className={ITEM_CLASSES}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700" aria-hidden="true">
              <Flag className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <ApplicationLink application={event.application} />
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  {whenLabel(event.date, today)}
                </span>
              </div>
              <p className="truncate text-sm text-slate-600">{event.application.company}</p>
              <p className="mt-1.5 text-sm text-slate-500">
                {describeDeadline(event.application.status)} · <time dateTime={event.date}>{formatDate(event.date)}</time>
              </p>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card aria-labelledby="upcoming-deadlines-title">
      <CardHeader
        titleId="upcoming-deadlines-title"
        title="Upcoming Deadlines"
        icon={Flag}
        iconTone="warning"
        action={<ViewAllLink to="/calendar" what="in the calendar" />}
      />
      <div className="p-4 sm:p-5">{content}</div>
    </Card>
  );
}

/** The newest applications, with when they were added and the salary if known. */
export function RecentApplications({ query, onAdd }) {
  let content;
  if (query.isPending) content = <ListSkeleton rows={3} />;
  else if (query.isError) {
    content = <LoadErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  } else if (query.data.items.length === 0) {
    content = (
      <EmptyState
        icon={Inbox}
        title="No applications yet"
        description="Add the first role you’ve applied to and My Job Trackr will start tracking your progress."
        action={
          <Button icon={Plus} onClick={onAdd}>
            Add application
          </Button>
        }
      />
    );
  } else {
    content = (
      <ul className="space-y-3" aria-label="Recent applications">
        {query.data.items.map((application) => (
          <li key={application.id} className={ITEM_CLASSES}>
            <span
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-base font-semibold text-white"
              aria-hidden="true"
            >
              {application.company.trim().charAt(0).toUpperCase() || '?'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <ApplicationLink application={application} />
                <StatusBadge status={application.status} />
              </div>
              <p className="truncate text-sm text-slate-600">{application.company}</p>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <span className="text-slate-500">Added {formatTimeAgo(application.createdAt).toLowerCase()}</span>
                {application.salaryRange && <span className="font-medium text-slate-700">{application.salaryRange}</span>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card aria-labelledby="recent-applications-title">
      <CardHeader
        titleId="recent-applications-title"
        title="Recent Applications"
        icon={ClipboardList}
        iconTone="success"
        action={<ViewAllLink to="/applications" what="applications" />}
      />
      <div className="p-4 sm:p-5">{content}</div>
    </Card>
  );
}

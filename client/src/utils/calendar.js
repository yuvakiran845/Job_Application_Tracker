import { addDays, toISODate } from './date';

// Calendar helpers. Interviews are moments in time (ISO instants) shown in the
// user's time zone; deadlines are calendar dates with no time. A local date range
// is therefore sent to the API in both forms.

/**
 * API range for local calendar days `start`..`end` (Date objects at any time of day):
 * `{ start, end }` as "YYYY-MM-DD" and `{ startAt, endAt }` as UTC instants covering
 * local midnight to the last millisecond of `end`.
 */
export function toEventRange(startDate, endDate) {
  const startAt = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endAt = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
  endAt.setMilliseconds(-1);
  return {
    start: toISODate(startAt),
    end: toISODate(endDate),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
  };
}

/** Weeks (Monday first) covering the month that contains `monthDate`. */
export function getMonthGrid(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = addDays(first, -((first.getDay() + 6) % 7));
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const gridEnd = addDays(last, 6 - ((last.getDay() + 6) % 7));

  const weeks = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) {
    if ((day.getDay() + 6) % 7 === 0) weeks.push([]);
    weeks.at(-1).push(day);
  }
  return { weeks, gridStart, gridEnd };
}

/** Local calendar date ("YYYY-MM-DD") on which an event happens. */
export function getEventDay(event) {
  return event.type === 'interview' ? toISODate(new Date(event.at)) : event.date;
}

// Rejected or withdrawn applications have nothing coming up. Their events stay on
// the month grid as history, but are left out of "upcoming" lists.
const CLOSED_STATUSES = new Set(['rejected', 'withdrawn']);

/** True for an event on or after `today` ("YYYY-MM-DD") whose application is still active. */
export function isUpcomingEvent(event, today) {
  return getEventDay(event) >= today && !CLOSED_STATUSES.has(event.application.status);
}

/** Interviews by time; deadlines first thing on their day (they have no time). */
export function sortEvents(events) {
  const key = (event) => (event.type === 'interview' ? event.at : `${event.date}T00:00:00`);
  return [...events].sort((a, b) => {
    const dayA = getEventDay(a);
    const dayB = getEventDay(b);
    if (dayA !== dayB) return dayA < dayB ? -1 : 1;
    if (a.type !== b.type) return a.type === 'deadline' ? -1 : 1;
    return key(a).localeCompare(key(b));
  });
}

export function groupEventsByDay(events) {
  const groups = new Map();
  for (const event of sortEvents(events)) {
    const day = getEventDay(event);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(event);
  }
  return groups;
}

/** What a deadline means depends on the stage the application is in. */
export function describeDeadline(status) {
  if (status === 'saved') return 'Application deadline';
  if (status === 'assessment') return 'Assessment due';
  if (status === 'offer') return 'Offer response due';
  return 'Deadline';
}

/** e.g. "GMT+5:30" — shown so it's clear which time zone times are in. */
export function getTimeZoneLabel(locale) {
  const part = new Intl.DateTimeFormat(locale, { timeZoneName: 'short' })
    .formatToParts(new Date())
    .find((item) => item.type === 'timeZoneName');
  return part?.value ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

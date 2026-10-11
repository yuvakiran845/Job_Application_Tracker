// Calendar dates (applied date, deadline) are "YYYY-MM-DD" strings. They have no
// time zone, so lexical comparison of the strings matches chronological order.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export function isCalendarDate(value) {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isIsoDateTime(value) {
  return ISO_DATE_TIME.test(value) && !Number.isNaN(Date.parse(value));
}

/** UTC calendar date, offset by `days`. */
export function utcDateString(days = 0, now = new Date()) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Two kinds of dates are used:
//
// - Calendar dates without a time (applied date, deadline) are stored as
//   "YYYY-MM-DD" strings and interpreted in the user's local time zone. This
//   avoids the off-by-one-day bugs caused by parsing them as UTC midnight.
// - Moments in time (interview date and time, timestamps) are stored as ISO 8601
//   strings in UTC and displayed in the user's local time zone.

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseISODate(value) {
  if (typeof value !== 'string') return null;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // Rejects impossible dates such as 2026-02-30, which Date would roll over.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(now = new Date()) {
  return toISODate(now);
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Whole calendar days from `from` to `to` (both "YYYY-MM-DD"); null if either is invalid. */
export function daysBetween(from, to) {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (!start || !end) return null;
  // Round to absorb daylight-saving shifts.
  return Math.round((end - start) / DAY_MS);
}

export function isISODateTime(value) {
  return typeof value === 'string' && ISO_DATE_TIME_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

/** ISO instant → value for <input type="datetime-local"> in the user's time zone. */
export function toLocalDateTimeInput(iso) {
  if (!isISODateTime(iso)) return '';
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${toISODate(date)}T${hours}:${minutes}`;
}

/** <input type="datetime-local"> value (local time) → ISO instant in UTC. Invalid input is returned unchanged. */
export function fromLocalDateTimeInput(value) {
  if (!value) return '';
  if (!LOCAL_DATE_TIME_PATTERN.test(value)) return value;
  const date = new Date(value); // No offset in the string, so it is parsed as local time.
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function formatDate(value, locale) {
  const date = parseISODate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function formatDateTime(iso, locale) {
  if (!iso || Number.isNaN(Date.parse(iso))) return '';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

export function formatLongDate(date, locale) {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

export function getGreeting(date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Short relative label for an upcoming date, e.g. "Today", "In 3 days", "Passed". */
export function describeDueDate(value, today) {
  const days = daysBetween(today, value);
  if (days === null) return '';
  if (days < 0) return 'Passed';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 14) return `In ${days} days`;
  return '';
}

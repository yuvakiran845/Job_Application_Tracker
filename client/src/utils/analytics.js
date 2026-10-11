import { STATUS_VALUES } from '../constants/applications';
import { addDays, toISODate } from './date';

// Mirrors server/src/services/analyticsService.js (used by the sample-data service
// and for the definitions shown on the Analytics page). Rates use *current* status
// and divide by submitted applications (those with an applied date in the range).

const RESPONDED = ['assessment', 'interview', 'offer', 'rejected'];
const REACHED_INTERVIEW = ['interview', 'offer'];
const DAY_MS = 24 * 60 * 60 * 1000;

export const RANGE_PRESETS = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];

/** Local calendar range for a preset; "all" has no bounds. */
export function getPresetRange(preset, now = new Date()) {
  const to = toISODate(now);
  if (preset === '30d') return { from: toISODate(addDays(now, -29)), to };
  if (preset === '90d') return { from: toISODate(addDays(now, -89)), to };
  if (preset === '12m') {
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    return { from: toISODate(start), to };
  }
  return { from: '', to: '' };
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(value) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return formatDate(date);
}

function monthsBetween(from, to) {
  return (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7));
}

export function chooseGranularity(from, to) {
  const days = (parseDate(to) - parseDate(from)) / DAY_MS;
  if (days <= 92) return 'week';
  if (monthsBetween(from, to) <= 60) return 'month';
  return 'year';
}

function bucketStart(value, granularity) {
  if (granularity === 'week') return startOfWeek(value);
  if (granularity === 'month') return `${value.slice(0, 7)}-01`;
  return `${value.slice(0, 4)}-01-01`;
}

function nextBucket(start, granularity) {
  const date = parseDate(start);
  if (granularity === 'week') date.setUTCDate(date.getUTCDate() + 7);
  else if (granularity === 'month') date.setUTCMonth(date.getUTCMonth() + 1);
  else date.setUTCFullYear(date.getUTCFullYear() + 1);
  return formatDate(date);
}

export function computeAnalytics(records, { from = '', to = '' } = {}) {
  const byStatus = Object.fromEntries(STATUS_VALUES.map((status) => [status, 0]));
  const sourceCounts = new Map();
  for (const record of records) {
    if (record.status in byStatus) byStatus[record.status] += 1;
    const source = record.source || '';
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  const submitted = records.length;
  const responded = RESPONDED.reduce((sum, status) => sum + byStatus[status], 0);
  const reachedInterview = REACHED_INTERVIEW.reduce((sum, status) => sum + byStatus[status], 0);
  const rate = (count) => (submitted === 0 ? null : count / submitted);

  const dates = records.map((record) => record.appliedDate).sort();
  const rangeFrom = from || dates[0];
  const rangeTo = to || dates.at(-1);
  let granularity = null;
  const overTime = [];
  if (rangeFrom && rangeTo) {
    granularity = chooseGranularity(rangeFrom, rangeTo);
    const counts = new Map();
    for (const date of dates) {
      const key = bucketStart(date, granularity);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const last = bucketStart(rangeTo, granularity);
    for (let start = bucketStart(rangeFrom, granularity); start <= last; start = nextBucket(start, granularity)) {
      overTime.push({ start, count: counts.get(start) ?? 0 });
    }
  }

  return {
    range: { from: from || null, to: to || null },
    granularity,
    totals: {
      submitted,
      responded,
      reachedInterview,
      offers: byStatus.offer,
      rejections: byStatus.rejected,
      withdrawn: byStatus.withdrawn,
    },
    rates: { response: rate(responded), interview: rate(reachedInterview), offer: rate(byStatus.offer) },
    byStatus,
    overTime,
    bySource: [...sourceCounts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
  };
}

/** Bucket label for charts and tables, e.g. "Week of Sep 7", "Sep 2026", "2026". */
export function formatBucket(start, granularity, locale) {
  const [year, month, day] = start.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (granularity === 'week') {
    return `Week of ${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)}`;
  }
  if (granularity === 'month') return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
  return String(year);
}

export function formatPercent(value) {
  return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;
}

import { STATUS_VALUES } from '../constants/applications.js';
import { Application } from '../models/Application.js';
import { ownerId } from './applicationService.js';

// Analytics are computed only from the signed-in user's records. Metric definitions
// (shown to users on the Analytics page):
//
// - Submitted: applications with an applied date inside the range.
// - Responded: submitted applications now at Assessment, Interview, Offer or Rejected.
// - Reached interview: submitted applications now at Interview or Offer.
// - Rates divide by Submitted; they are null when nothing was submitted.
//
// Rates reflect *current* status. An application rejected after an interview counts
// as Rejected, not as an interview — history-based rates would need activity data
// that older records don't have, and none is invented.

const RESPONDED = ['assessment', 'interview', 'offer', 'rejected'];
const REACHED_INTERVIEW = ['interview', 'offer'];
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing `value` ("YYYY-MM-DD"). */
export function startOfWeek(value) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return formatDate(date);
}

function monthsBetween(from, to) {
  return (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7));
}

/** Week buckets for ranges up to ~3 months, months up to 5 years, years beyond that. */
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

/**
 * Pure calculation over records `{ status, appliedDate, source }` that all have an
 * applied date inside [from, to]. `from`/`to` may be empty for "all time".
 */
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

  // Applications over time, zero-filled between the first and last bucket.
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

export async function getAnalytics(userId, { from, to }) {
  const appliedDate = { $gt: '' };
  if (from) appliedDate.$gte = from;
  if (to) appliedDate.$lte = to;
  const records = await Application.find({ userId: ownerId(userId), appliedDate })
    .select('status appliedDate source -_id')
    .lean();
  return computeAnalytics(records, { from, to });
}

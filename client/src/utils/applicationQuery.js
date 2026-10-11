import { STATUS_VALUES } from '../constants/applications';
import { parseISODate } from './date';

// Search, filter, sort and paginate applications. The query shape doubles as the
// URL search params and the future API query string (GET /api/applications?…),
// so moving this work to the server in Level 6 keeps the same contract.

export const SORT_FIELDS = ['createdAt', 'appliedDate', 'company', 'deadline', 'status'];
export const PAGE_SIZES = [10, 25, 50];

export const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Recently added' },
  { value: 'appliedDate:desc', label: 'Applied date (newest)' },
  { value: 'appliedDate:asc', label: 'Applied date (oldest)' },
  { value: 'company:asc', label: 'Company (A–Z)' },
  { value: 'company:desc', label: 'Company (Z–A)' },
  { value: 'deadline:asc', label: 'Deadline (soonest)' },
  { value: 'deadline:desc', label: 'Deadline (latest)' },
  { value: 'status:asc', label: 'Status (pipeline order)' },
  { value: 'status:desc', label: 'Status (reverse order)' },
];

// Direction used when a column is first sorted.
export const DEFAULT_SORT_ORDER = {
  createdAt: 'desc',
  appliedDate: 'desc',
  company: 'asc',
  deadline: 'asc',
  status: 'asc',
};

export const DEFAULT_QUERY = {
  q: '',
  status: '',
  location: '',
  from: '',
  to: '',
  sort: 'createdAt',
  order: 'desc',
  page: 1,
  pageSize: PAGE_SIZES[0],
};

const FILTER_KEYS = ['q', 'status', 'location', 'from', 'to'];
const STATUS_RANK = Object.fromEntries(STATUS_VALUES.map((status, index) => [status, index]));
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .trim();
}

function toPositiveInt(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

/** Reads a query from URLSearchParams, replacing anything invalid with defaults. */
export function parseApplicationQuery(searchParams) {
  const get = (key) => searchParams.get(key)?.trim() ?? '';
  const status = get('status');
  const from = get('from');
  const to = get('to');
  const sort = get('sort');
  const order = get('order');
  const pageSize = toPositiveInt(get('pageSize'), DEFAULT_QUERY.pageSize);

  return {
    q: get('q'),
    status: STATUS_VALUES.includes(status) ? status : '',
    location: get('location'),
    from: parseISODate(from) ? from : '',
    to: parseISODate(to) ? to : '',
    sort: SORT_FIELDS.includes(sort) ? sort : DEFAULT_QUERY.sort,
    order: order === 'asc' || order === 'desc' ? order : DEFAULT_QUERY.order,
    page: toPositiveInt(get('page'), 1),
    pageSize: PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_QUERY.pageSize,
  };
}

/** Serializes a query to URLSearchParams, omitting default values to keep URLs short. */
export function toSearchParams(query) {
  const params = new URLSearchParams();
  for (const [key, defaultValue] of Object.entries(DEFAULT_QUERY)) {
    const value = query[key];
    if (value !== undefined && value !== '' && value !== defaultValue) params.set(key, String(value));
  }
  return params;
}

export function countActiveFilters(query) {
  return FILTER_KEYS.filter((key) => query[key]).length;
}

export function filterApplications(applications, { q, status, location, from, to }) {
  const search = q ? normalizeText(q) : '';
  const place = location ? normalizeText(location) : '';

  return applications.filter((application) => {
    if (status && application.status !== status) return false;
    if (search) {
      const haystack = normalizeText(`${application.company} ${application.jobTitle}`);
      if (!haystack.includes(search)) return false;
    }
    if (place && !normalizeText(application.location).includes(place)) return false;
    // A date range only matches applications that have an applied date.
    if (from && (!application.appliedDate || application.appliedDate < from)) return false;
    if (to && (!application.appliedDate || application.appliedDate > to)) return false;
    return true;
  });
}

function compareBy(field, a, b) {
  switch (field) {
    case 'company':
      return collator.compare(a.company, b.company);
    case 'status':
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    default:
      // ISO date strings and timestamps sort correctly as plain strings.
      return a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
  }
}

/** Sorts a copy of the list. Empty values always go last; ties fall back to newest first. */
export function sortApplications(applications, sort, order) {
  const direction = order === 'asc' ? 1 : -1;
  return [...applications].sort((a, b) => {
    const aEmpty = !a[sort];
    const bEmpty = !b[sort];
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
    const result = aEmpty ? 0 : compareBy(sort, a, b) * direction;
    return result || b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * Filters, sorts and paginates like GET /api/applications. A page past the end
 * returns no items (the API does the same); callers decide how to recover.
 */
export function queryApplications(applications, query) {
  const filtered = filterApplications(applications, query);
  const sorted = sortApplications(filtered, query.sort, query.order);
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const start = (query.page - 1) * query.pageSize;
  const items = sorted.slice(start, start + query.pageSize);

  return { items, total, page: query.page, pageSize: query.pageSize, pageCount };
}

/** "Showing X–Y of Z" numbers for a page of results. */
export function getPageRange({ page, pageSize, total }, itemCount) {
  if (itemCount === 0) return { rangeStart: 0, rangeEnd: 0, total };
  const rangeStart = (page - 1) * pageSize + 1;
  return { rangeStart, rangeEnd: rangeStart + itemCount - 1, total };
}

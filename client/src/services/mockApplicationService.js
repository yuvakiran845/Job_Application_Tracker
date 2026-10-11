/**
 * In-memory implementation of the application data service (VITE_DATA_SOURCE=mock,
 * development and tests only). Seeded with development-only sample data; changes
 * live until the page is reloaded. Mirrors the REST API's responses, filtering,
 * pagination, activity rules and errors so the UI can be developed and tested
 * without a server. Used through services/applicationService.js.
 */
import { APPLICATION_SOURCES, APPLICATION_STATUSES, EMPLOYMENT_TYPES, getOptionLabel } from '../constants/applications';
import { buildSampleApplications } from '../data/sampleApplications';
import { computeAnalytics } from '../utils/analytics';
import { createApplicationRecord } from '../utils/applicationModel';
import { DEFAULT_QUERY, parseApplicationQuery, queryApplications } from '../utils/applicationQuery';
import { toCsv } from '../utils/csv';
import { todayISO } from '../utils/date';
import { createId } from '../utils/format';
import { computeApplicationStats } from '../utils/stats';
import { validateApplicationInput } from '../utils/validation';
import { ApiError, NotFoundError, ValidationError } from './errors';

// Simulated network latency so loading and saving states are exercised in development.
const MOCK_LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 350;

const TRACKED_FIELDS = [
  'company',
  'jobTitle',
  'location',
  'jobUrl',
  'employmentType',
  'salaryRange',
  'source',
  'appliedDate',
  'deadline',
  'interviewDate',
  'contact.name',
  'contact.email',
  'contact.phone',
  'notes',
];

let store = null;
let activity = [];
let views = [];

function getStore() {
  store ??= buildSampleApplications();
  return store;
}

function simulateLatency() {
  return new Promise((resolve) => {
    setTimeout(resolve, MOCK_LATENCY_MS);
  });
}

function findOrThrow(id) {
  const application = getStore().find((item) => item.id === id);
  if (!application) throw new NotFoundError();
  return application;
}

function assertValid(input) {
  const fieldErrors = validateApplicationInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError('Some fields need your attention.', fieldErrors);
  }
}

function getPath(record, path) {
  return path.split('.').reduce((value, key) => value?.[key], record);
}

function record(applicationId, entry) {
  activity = [{ id: createId(), applicationId, createdAt: new Date().toISOString(), ...entry }, ...activity];
}

/** Same contract as GET /api/applications: `{ items, meta: { page, pageSize, total, pageCount } }`. */
export async function listApplications(query = {}) {
  await simulateLatency();
  const { items, page, pageSize, total, pageCount } = queryApplications(getStore(), { ...DEFAULT_QUERY, ...query });
  return structuredClone({ items, meta: { page, pageSize, total, pageCount } });
}

export async function getApplication(id) {
  await simulateLatency();
  return structuredClone(findOrThrow(id));
}

export async function getApplicationStats({ appliedSince }) {
  await simulateLatency();
  return computeApplicationStats(getStore(), { appliedSince });
}

export async function createApplication(input) {
  await simulateLatency();
  assertValid(input);

  const created = createApplicationRecord(input);
  store = [created, ...getStore()];
  record(created.id, { type: 'created', toStatus: created.status });
  return structuredClone(created);
}

/**
 * Applies `changes` (any subset of fields) to an application and validates the
 * result as a whole, so partial updates can't leave a record in an invalid state.
 */
export async function updateApplication(id, changes) {
  await simulateLatency();
  const current = findOrThrow(id);
  const merged = { ...current, ...changes, contact: { ...current.contact, ...changes.contact } };
  assertValid(merged);

  const updated = { ...createApplicationRecord(merged, { id }), createdAt: current.createdAt };
  store = getStore().map((item) => (item.id === id ? updated : item));

  if (updated.status !== current.status) {
    record(id, { type: 'status_changed', fromStatus: current.status, toStatus: updated.status });
  }
  const fields = TRACKED_FIELDS.filter((path) => getPath(updated, path) !== getPath(current, path));
  if (fields.length > 0) record(id, { type: 'updated', fields });
  return structuredClone(updated);
}

export async function deleteApplication(id) {
  await simulateLatency();
  findOrThrow(id);
  store = getStore().filter((item) => item.id !== id);
  activity = activity.filter((entry) => entry.applicationId !== id);
}

export async function listActivity(id) {
  await simulateLatency();
  findOrThrow(id);
  return structuredClone(activity.filter((entry) => entry.applicationId === id)).map(
    ({ applicationId: _applicationId, ...entry }) => entry,
  );
}

const CSV_COLUMNS = [
  { header: 'Company', value: (row) => row.company },
  { header: 'Job title', value: (row) => row.jobTitle },
  { header: 'Location', value: (row) => row.location },
  { header: 'Status', value: (row) => getOptionLabel(APPLICATION_STATUSES, row.status) },
  { header: 'Applied date', value: (row) => row.appliedDate },
  { header: 'Deadline', value: (row) => row.deadline },
  { header: 'Interview (UTC)', value: (row) => row.interviewDate },
  { header: 'Employment type', value: (row) => getOptionLabel(EMPLOYMENT_TYPES, row.employmentType) },
  { header: 'Salary range', value: (row) => row.salaryRange },
  { header: 'Source', value: (row) => getOptionLabel(APPLICATION_SOURCES, row.source) },
  { header: 'Job URL', value: (row) => row.jobUrl },
  { header: 'Contact name', value: (row) => row.contact.name },
  { header: 'Contact email', value: (row) => row.contact.email },
  { header: 'Contact phone', value: (row) => row.contact.phone },
  { header: 'Notes', value: (row) => row.notes },
  { header: 'Added', value: (row) => row.createdAt },
  { header: 'Last updated', value: (row) => row.updatedAt },
];

export async function exportApplications(query = {}) {
  await simulateLatency();
  const { items } = queryApplications(getStore(), { ...DEFAULT_QUERY, ...query, page: 1, pageSize: 5000 });
  return {
    blob: new Blob([toCsv(items, CSV_COLUMNS)], { type: 'text/csv;charset=utf-8' }),
    filename: `careerflow-applications-${todayISO()}.csv`,
  };
}

export async function getAnalytics({ from = '', to = '' }) {
  await simulateLatency();
  const records = getStore().filter(
    (item) => item.appliedDate && (!from || item.appliedDate >= from) && (!to || item.appliedDate <= to),
  );
  return computeAnalytics(records, { from, to });
}

export async function listEvents({ start, end, startAt, endAt }) {
  await simulateLatency();
  const summary = (item) => ({ id: item.id, company: item.company, jobTitle: item.jobTitle, status: item.status });
  const events = [];
  for (const item of getStore()) {
    if (item.interviewDate && item.interviewDate >= startAt && item.interviewDate <= endAt) {
      events.push({ id: `${item.id}:interview`, type: 'interview', at: item.interviewDate, application: summary(item) });
    }
    if (item.deadline && item.deadline >= start && item.deadline <= end) {
      events.push({ id: `${item.id}:deadline`, type: 'deadline', date: item.deadline, application: summary(item) });
    }
  }
  return structuredClone(events);
}

/** Same normalization as the API: list filters only, no page, defaults omitted. */
function normalizeViewQuery(query) {
  const parsed = parseApplicationQuery(new URLSearchParams(query));
  const params = new URLSearchParams();
  for (const key of ['q', 'status', 'location', 'from', 'to', 'sort', 'order', 'pageSize']) {
    if (parsed[key] !== '' && parsed[key] !== DEFAULT_QUERY[key]) params.set(key, String(parsed[key]));
  }
  return params.toString();
}

export async function listViews() {
  await simulateLatency();
  return structuredClone([...views].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
}

export async function createView({ name, query }) {
  await simulateLatency();
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError('Some fields need your attention.', { name: 'Name is required.' });
  if (views.some((view) => view.name.toLowerCase() === trimmed.toLowerCase())) {
    const message = 'You already have a view with this name.';
    throw new ValidationError(message, { name: message });
  }
  if (views.length >= 20) {
    throw new ApiError('You can save up to 20 views. Delete one to add another.', { status: 409, code: 'VIEW_LIMIT' });
  }
  const view = { id: createId(), name: trimmed, query: normalizeViewQuery(query), createdAt: new Date().toISOString() };
  views = [...views, view];
  return structuredClone(view);
}

export async function deleteView(id) {
  await simulateLatency();
  if (!views.some((view) => view.id === id)) throw new NotFoundError('Saved view not found.');
  views = views.filter((view) => view.id !== id);
}

/** Development-only: restores the original sample data (and clears history and views). */
export async function resetSampleData() {
  await simulateLatency();
  store = buildSampleApplications();
  activity = [];
  views = [];
}

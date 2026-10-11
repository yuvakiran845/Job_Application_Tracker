import { EMPLOYMENT_TYPE_LABELS, SOURCE_LABELS, STATUS_LABELS } from '../constants/applications.js';
import * as analyticsService from '../services/analyticsService.js';
import * as applicationService from '../services/applicationService.js';
import { toCsv } from '../utils/csv.js';
import { utcDateString } from '../utils/dates.js';

// Controllers translate HTTP to service calls. Successful responses are always
// `{ data }` (plus `meta` for lists). Express 5 forwards rejected promises to the
// error handler, so no try/catch is needed here.

export async function list(req, res) {
  const { items, meta } = await applicationService.listApplications(req.user.id, req.validated.query);
  res.json({ data: items, meta });
}

export async function stats(req, res) {
  res.json({ data: await applicationService.getApplicationStats(req.user.id, req.validated.query) });
}

export async function getById(req, res) {
  res.json({ data: await applicationService.getApplication(req.user.id, req.validated.params.id) });
}

export async function create(req, res) {
  const application = await applicationService.createApplication(req.user.id, req.validated.body);
  res.status(201).location(`${req.baseUrl}/${application.id}`).json({ data: application });
}

export async function update(req, res) {
  const { id } = req.validated.params;
  res.json({ data: await applicationService.updateApplication(req.user.id, id, req.validated.body) });
}

export async function remove(req, res) {
  await applicationService.deleteApplication(req.user.id, req.validated.params.id);
  res.status(204).end();
}

// Column order and headers of the CSV export.
const CSV_COLUMNS = [
  { header: 'Company', value: (row) => row.company },
  { header: 'Job title', value: (row) => row.jobTitle },
  { header: 'Location', value: (row) => row.location },
  { header: 'Status', value: (row) => STATUS_LABELS[row.status] ?? row.status },
  { header: 'Applied date', value: (row) => row.appliedDate },
  { header: 'Deadline', value: (row) => row.deadline },
  { header: 'Interview (UTC)', value: (row) => row.interviewDate },
  { header: 'Employment type', value: (row) => EMPLOYMENT_TYPE_LABELS[row.employmentType] ?? '' },
  { header: 'Salary range', value: (row) => row.salaryRange },
  { header: 'Source', value: (row) => SOURCE_LABELS[row.source] ?? '' },
  { header: 'Job URL', value: (row) => row.jobUrl },
  { header: 'Contact name', value: (row) => row.contact.name },
  { header: 'Contact email', value: (row) => row.contact.email },
  { header: 'Contact phone', value: (row) => row.contact.phone },
  { header: 'Notes', value: (row) => row.notes },
  { header: 'Added', value: (row) => row.createdAt },
  { header: 'Last updated', value: (row) => row.updatedAt },
];

/** Downloads the signed-in user's applications matching the current filters. */
export async function exportCsv(req, res) {
  const rows = await applicationService.exportApplications(req.user.id, req.validated.query);
  res
    .status(200)
    .set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="careerflow-applications-${utcDateString()}.csv"`,
      // Personal data: never store in shared caches.
      'Cache-Control': 'no-store',
    })
    .send(toCsv(rows, CSV_COLUMNS));
}

export async function analytics(req, res) {
  res.json({ data: await analyticsService.getAnalytics(req.user.id, req.validated.query) });
}

export async function events(req, res) {
  res.json({ data: await applicationService.listEvents(req.user.id, req.validated.query) });
}

export async function activity(req, res) {
  res.json({ data: await applicationService.listActivity(req.user.id, req.validated.params.id) });
}

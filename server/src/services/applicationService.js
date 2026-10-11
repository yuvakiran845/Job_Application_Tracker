import mongoose from 'mongoose';
import { STATUSES_REQUIRING_APPLIED_DATE, STATUS_VALUES } from '../constants/applications.js';
import { Activity, serializeActivity } from '../models/Activity.js';
import { Application, serializeApplication } from '../models/Application.js';
import { utcDateString } from '../utils/dates.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { escapeRegex, normalizeText } from '../utils/text.js';

// Every function takes the owner's id from the authenticated request and includes
// it in the query, so one user can never read or change another user's records.
// Missing and foreign records both produce 404, which avoids revealing that an ID exists.

// Case-insensitive, numeric-aware ordering for company names ("Company 9" < "Company 10").
const COMPANY_COLLATION = { locale: 'en', strength: 2, numericOrdering: true };

// Upper bound for a single CSV export.
export const EXPORT_LIMIT = 5000;

// Fields whose edits are recorded in the activity timeline (names only, never values).
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

export function ownerId(userId) {
  return new mongoose.Types.ObjectId(userId);
}

/**
 * Rules that span several fields, checked on the final record for both create and update.
 * Applied dates may be up to one day ahead of the server's UTC date, because the
 * user's local "today" can already be tomorrow in UTC terms.
 */
function assertBusinessRules({ status, appliedDate }) {
  const fieldErrors = {};
  if (!appliedDate && STATUSES_REQUIRING_APPLIED_DATE.includes(status)) {
    fieldErrors.appliedDate = 'Applied date is required for this status.';
  } else if (appliedDate && appliedDate > utcDateString(1)) {
    fieldErrors.appliedDate = 'Applied date can’t be in the future.';
  }
  if (Object.keys(fieldErrors).length > 0) throw new ValidationError(fieldErrors);
}

async function findOwned(userId, id) {
  const application = await Application.findOne({ _id: id, userId: ownerId(userId) });
  if (!application) throw new NotFoundError();
  return application;
}

/**
 * Records timeline entries. Best effort: a failed history write is logged but never
 * undoes or fails the user's actual change (MongoDB transactions need a replica set,
 * which local and free-tier setups may not have).
 */
async function recordActivity(entries) {
  if (entries.length === 0) return;
  try {
    await Activity.insertMany(entries);
  } catch (error) {
    logger.error('Failed to record activity', { name: error.name });
  }
}

function buildMatch(userId, { q, status, location, from, to }) {
  const match = { userId: ownerId(userId) };
  if (status) match.status = status;
  if (q) match.searchText = { $regex: escapeRegex(normalizeText(q)) };
  if (location) match.locationText = { $regex: escapeRegex(normalizeText(location)) };
  if (from || to) {
    // A date range only matches applications that have an applied date.
    match.appliedDate = { $gt: '' };
    if (from) match.appliedDate.$gte = from;
    if (to) match.appliedDate.$lte = to;
  }
  return match;
}

function buildSortStages(sort, order) {
  const direction = order === 'asc' ? 1 : -1;
  const sortKey = sort === 'status' ? 'statusRank' : sort;
  const sortByDate = sort === 'appliedDate' || sort === 'deadline';
  return [
    {
      $addFields: {
        // Empty dates sort last in both directions; statuses sort in pipeline order.
        sortIsEmpty: sortByDate ? { $eq: [`$${sort}`, ''] } : false,
        statusRank: { $indexOfArray: [STATUS_VALUES, '$status'] },
      },
    },
    { $sort: { sortIsEmpty: 1, [sortKey]: direction, createdAt: -1, _id: -1 } },
  ];
}

// Collation only when needed: string comparisons can use an index only if the index
// has the same collation, so applying it everywhere would stop the { userId, status }
// index from serving status filters.
function collationFor(sort) {
  return sort === 'company' ? COMPANY_COLLATION : undefined;
}

async function runAggregate(pipeline, collation) {
  const aggregate = Application.aggregate(pipeline);
  if (collation) aggregate.collation(collation);
  return aggregate;
}

/**
 * Aggregation pipeline (and collation) for the list endpoint. Exported so tests
 * can check with explain() that it is served by an index.
 */
export function buildListQuery(userId, query) {
  const { page, pageSize } = query;
  const pipeline = [
    { $match: buildMatch(userId, query) },
    ...buildSortStages(query.sort, query.order),
    {
      $facet: {
        items: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
        total: [{ $count: 'count' }],
      },
    },
  ];
  return { pipeline, collation: collationFor(query.sort) };
}

export async function listApplications(userId, query) {
  const { pipeline, collation } = buildListQuery(userId, query);
  const [result] = await runAggregate(pipeline, collation);

  const total = result.total[0]?.count ?? 0;
  const { page, pageSize } = query;
  return {
    items: result.items.map(serializeApplication),
    meta: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

/** Every application matching the list filters, in list order (for CSV export). */
export async function exportApplications(userId, query) {
  const pipeline = [
    { $match: buildMatch(userId, query) },
    ...buildSortStages(query.sort, query.order),
    { $limit: EXPORT_LIMIT },
  ];
  const documents = await runAggregate(pipeline, collationFor(query.sort));
  return documents.map(serializeApplication);
}

export async function getApplication(userId, id) {
  return serializeApplication(await findOwned(userId, id));
}

export async function createApplication(userId, input) {
  assertBusinessRules({ status: input.status, appliedDate: input.appliedDate ?? '' });
  const application = await Application.create({ ...input, userId: ownerId(userId) });
  await recordActivity([
    { userId: application.userId, applicationId: application._id, type: 'created', toStatus: application.status },
  ]);
  return serializeApplication(application);
}

/** Applies any subset of fields, then validates the record as a whole before saving. */
export async function updateApplication(userId, id, changes) {
  const application = await findOwned(userId, id);
  const previousStatus = application.status;
  const { contact, ...fields } = changes;

  application.set(fields);
  // Set contact fields one by one so a partial contact update keeps the other fields.
  for (const [key, value] of Object.entries(contact ?? {})) {
    application.set(`contact.${key}`, value);
  }

  assertBusinessRules({ status: application.status, appliedDate: application.appliedDate });
  // Mongoose only marks paths whose value actually changed.
  const changedFields = TRACKED_FIELDS.filter((path) => application.isModified(path));
  const statusChanged = application.status !== previousStatus;
  await application.save();

  const base = { userId: application.userId, applicationId: application._id };
  await recordActivity([
    ...(statusChanged ? [{ ...base, type: 'status_changed', fromStatus: previousStatus, toStatus: application.status }] : []),
    ...(changedFields.length > 0 ? [{ ...base, type: 'updated', fields: changedFields }] : []),
  ]);
  return serializeApplication(application);
}

export async function deleteApplication(userId, id) {
  const owner = ownerId(userId);
  const { deletedCount } = await Application.deleteOne({ _id: id, userId: owner });
  if (deletedCount === 0) throw new NotFoundError();
  // The history goes with the application.
  await Activity.deleteMany({ userId: owner, applicationId: id });
}

/** Timeline for one application, newest first. */
export async function listActivity(userId, id, { limit = 100 } = {}) {
  const application = await findOwned(userId, id);
  const activities = await Activity.find({ userId: application.userId, applicationId: application._id })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();
  return activities.map(serializeActivity);
}

/**
 * Dashboard numbers for one user. `appliedSince` should be the client's local
 * calendar date for the start of the window; it defaults to 30 days in UTC.
 */
export function buildStatsPipeline(userId, since) {
  return [
    { $match: { userId: ownerId(userId) } },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        appliedSince: [{ $match: { appliedDate: { $gte: since } } }, { $count: 'count' }],
      },
    },
  ];
}

export async function getApplicationStats(userId, { appliedSince }) {
  const since = appliedSince || utcDateString(-29);
  const [result] = await Application.aggregate(buildStatsPipeline(userId, since));

  const byStatus = Object.fromEntries(STATUS_VALUES.map((status) => [status, 0]));
  for (const { _id, count } of result.byStatus) byStatus[_id] = count;
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return {
    total,
    byStatus,
    interviews: byStatus.interview,
    offers: byStatus.offer,
    rejections: byStatus.rejected,
    appliedSince: { from: since, count: result.appliedSince[0]?.count ?? 0 },
  };
}

/**
 * Interviews (moments in time) between `startAt` and `endAt`, and deadlines
 * (calendar dates) between `start` and `end`. The client sends both forms of its
 * local date range so time zones are handled correctly.
 */
export async function listEvents(userId, { start, end, startAt, endAt }) {
  const owner = ownerId(userId);
  const fields = 'company jobTitle status deadline interviewDate';
  const [interviews, deadlines] = await Promise.all([
    Application.find({ userId: owner, interviewDate: { $gte: new Date(startAt), $lte: new Date(endAt) } })
      .select(fields)
      .lean(),
    Application.find({ userId: owner, deadline: { $gte: start, $lte: end } })
      .select(fields)
      .lean(),
  ]);

  const summary = (doc) => ({ id: String(doc._id), company: doc.company, jobTitle: doc.jobTitle, status: doc.status });
  return [
    ...interviews.map((doc) => ({
      id: `${doc._id}:interview`,
      type: 'interview',
      at: doc.interviewDate.toISOString(),
      application: summary(doc),
    })),
    ...deadlines.map((doc) => ({
      id: `${doc._id}:deadline`,
      type: 'deadline',
      date: doc.deadline,
      application: summary(doc),
    })),
  ];
}

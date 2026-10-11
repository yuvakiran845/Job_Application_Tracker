import mongoose from 'mongoose';
import { STATUSES_REQUIRING_APPLIED_DATE, STATUS_VALUES } from '../constants/applications.js';
import { Application, serializeApplication } from '../models/Application.js';
import { utcDateString } from '../utils/dates.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { escapeRegex, normalizeText } from '../utils/text.js';

// Every function takes the owner's id from the authenticated request and includes
// it in the query, so one user can never read or change another user's records.
// Missing and foreign records both produce 404, which avoids revealing that an ID exists.

// Case-insensitive, numeric-aware ordering for company names ("Company 9" < "Company 10").
const COMPANY_COLLATION = { locale: 'en', strength: 2, numericOrdering: true };

function ownerId(userId) {
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
 * Aggregation pipeline (and collation) for the list endpoint. Exported so tests
 * can check with explain() that it is served by an index.
 */
export function buildListQuery(userId, query) {
  const { q, status, location, from, to, sort, order, page, pageSize } = query;

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

  const direction = order === 'asc' ? 1 : -1;
  const sortKey = sort === 'status' ? 'statusRank' : sort;
  const sortByDate = sort === 'appliedDate' || sort === 'deadline';

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        // Empty dates sort last in both directions; statuses sort in pipeline order.
        sortIsEmpty: sortByDate ? { $eq: [`$${sort}`, ''] } : false,
        statusRank: { $indexOfArray: [STATUS_VALUES, '$status'] },
      },
    },
    { $sort: { sortIsEmpty: 1, [sortKey]: direction, createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
        total: [{ $count: 'count' }],
      },
    },
  ];

  // Collation only when needed: string comparisons can use an index only if the
  // index has the same collation, so applying it everywhere would stop the
  // { userId, status } index from serving status filters.
  return { pipeline, collation: sort === 'company' ? COMPANY_COLLATION : undefined };
}

export async function listApplications(userId, query) {
  const { pipeline, collation } = buildListQuery(userId, query);
  const aggregate = Application.aggregate(pipeline);
  if (collation) aggregate.collation(collation);
  const [result] = await aggregate;

  const total = result.total[0]?.count ?? 0;
  const { page, pageSize } = query;
  return {
    items: result.items.map(serializeApplication),
    meta: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getApplication(userId, id) {
  return serializeApplication(await findOwned(userId, id));
}

export async function createApplication(userId, input) {
  assertBusinessRules({ status: input.status, appliedDate: input.appliedDate ?? '' });
  const application = await Application.create({ ...input, userId: ownerId(userId) });
  return serializeApplication(application);
}

/** Applies any subset of fields, then validates the record as a whole before saving. */
export async function updateApplication(userId, id, changes) {
  const application = await findOwned(userId, id);
  const { contact, ...fields } = changes;

  application.set(fields);
  // Set contact fields one by one so a partial contact update keeps the other fields.
  for (const [key, value] of Object.entries(contact ?? {})) {
    application.set(`contact.${key}`, value);
  }

  assertBusinessRules({ status: application.status, appliedDate: application.appliedDate });
  await application.save();
  return serializeApplication(application);
}

export async function deleteApplication(userId, id) {
  const { deletedCount } = await Application.deleteOne({ _id: id, userId: ownerId(userId) });
  if (deletedCount === 0) throw new NotFoundError();
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

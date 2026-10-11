import { STATUS_VALUES } from '../constants/applications';
import { addDays, toISODate } from './date';

export const RECENT_WINDOW_DAYS = 30;

/** First day (local calendar date) of the "applied in the last 30 days" window, including today. */
export function getRecentWindowStart(now = new Date(), windowDays = RECENT_WINDOW_DAYS) {
  return toISODate(addDays(now, -(windowDays - 1)));
}

/**
 * Dashboard numbers in the same shape as GET /api/applications/stats, computed
 * from a list (used by the sample-data service).
 * - interviews / offers / rejections count applications *currently* in that status.
 * - appliedSince.count counts applications applied on or after `appliedSince`.
 */
export function computeApplicationStats(applications, { appliedSince }) {
  const byStatus = Object.fromEntries(STATUS_VALUES.map((status) => [status, 0]));
  let appliedSinceCount = 0;

  for (const application of applications) {
    if (application.status in byStatus) byStatus[application.status] += 1;
    if (application.appliedDate && application.appliedDate >= appliedSince) appliedSinceCount += 1;
  }

  return {
    total: applications.length,
    byStatus,
    interviews: byStatus.interview,
    offers: byStatus.offer,
    rejections: byStatus.rejected,
    appliedSince: { from: appliedSince, count: appliedSinceCount },
  };
}

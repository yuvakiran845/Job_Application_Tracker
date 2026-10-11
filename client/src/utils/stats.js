import { STATUS_VALUES } from '../constants/applications';
import { addDays, toISODate } from './date';

/**
 * Dashboard metrics derived from a list of applications.
 * - interviews / offers / rejections count applications *currently* in that status.
 * - appliedRecently counts applications whose applied date falls within the last
 *   `windowDays` days, including today.
 */
export function getApplicationStats(applications, { now = new Date(), windowDays = 30 } = {}) {
  const byStatus = Object.fromEntries(STATUS_VALUES.map((status) => [status, 0]));
  const today = toISODate(now);
  const windowStart = toISODate(addDays(now, -(windowDays - 1)));
  let appliedRecently = 0;

  for (const application of applications) {
    if (application.status in byStatus) byStatus[application.status] += 1;

    const { appliedDate } = application;
    if (appliedDate && appliedDate >= windowStart && appliedDate <= today) {
      appliedRecently += 1;
    }
  }

  return {
    total: applications.length,
    interviews: byStatus.interview,
    offers: byStatus.offer,
    rejections: byStatus.rejected,
    byStatus,
    appliedRecently,
    windowDays,
  };
}

export function sortByNewest(applications) {
  return [...applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

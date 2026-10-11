import { describe, expect, it } from 'vitest';
import { computeApplicationStats, getRecentWindowStart } from './stats';

function app(status, appliedDate) {
  return { status, appliedDate };
}

describe('computeApplicationStats', () => {
  it('returns zeros for an empty list', () => {
    const stats = computeApplicationStats([], { appliedSince: '2026-09-12' });
    expect(stats).toMatchObject({ total: 0, interviews: 0, offers: 0, rejections: 0 });
    expect(stats.appliedSince).toEqual({ from: '2026-09-12', count: 0 });
    expect(Object.values(stats.byStatus).every((count) => count === 0)).toBe(true);
  });

  it('counts by current status and applications since a date (matching the API shape)', () => {
    const stats = computeApplicationStats(
      [
        app('interview', '2026-10-01'),
        app('interview', '2026-09-01'),
        app('offer', '2026-08-15'),
        app('rejected', '2026-09-20'),
        app('saved', ''),
      ],
      { appliedSince: '2026-09-12' },
    );
    expect(stats).toEqual({
      total: 5,
      byStatus: { saved: 1, applied: 0, assessment: 0, interview: 2, offer: 1, rejected: 1, withdrawn: 0 },
      interviews: 2,
      offers: 1,
      rejections: 1,
      appliedSince: { from: '2026-09-12', count: 2 },
    });
  });
});

describe('getRecentWindowStart', () => {
  it('starts the 30-day window 29 days before today, in local time', () => {
    expect(getRecentWindowStart(new Date(2026, 9, 11, 23, 30))).toBe('2026-09-12');
    expect(getRecentWindowStart(new Date(2026, 0, 5, 0, 15))).toBe('2025-12-07');
  });
});

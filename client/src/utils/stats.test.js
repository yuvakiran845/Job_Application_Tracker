import { describe, expect, it } from 'vitest';
import { getApplicationStats, sortByNewest } from './stats';

const NOW = new Date(2026, 9, 11, 12, 0, 0); // 11 Oct 2026, local time

function app(status, appliedDate, createdAt = '2026-10-01T00:00:00.000Z') {
  return { status, appliedDate, createdAt };
}

describe('getApplicationStats', () => {
  it('returns zeros for an empty list', () => {
    const stats = getApplicationStats([], { now: NOW });
    expect(stats).toMatchObject({ total: 0, interviews: 0, offers: 0, rejections: 0, appliedRecently: 0 });
    expect(Object.values(stats.byStatus).every((count) => count === 0)).toBe(true);
  });

  it('counts applications by current status', () => {
    const stats = getApplicationStats(
      [
        app('interview', '2026-10-01'),
        app('interview', '2026-09-01'),
        app('offer', '2026-08-15'),
        app('rejected', '2026-09-20'),
        app('saved', ''),
      ],
      { now: NOW },
    );
    expect(stats.total).toBe(5);
    expect(stats.interviews).toBe(2);
    expect(stats.offers).toBe(1);
    expect(stats.rejections).toBe(1);
    expect(stats.byStatus.saved).toBe(1);
  });

  it('counts applications sent within the last 30 days, including today', () => {
    const stats = getApplicationStats(
      [
        app('applied', '2026-10-11'), // today
        app('applied', '2026-09-12'), // 29 days ago — first day of the window
        app('applied', '2026-09-11'), // 30 days ago — outside
        app('saved', ''),
      ],
      { now: NOW },
    );
    expect(stats.appliedRecently).toBe(2);
  });
});

describe('sortByNewest', () => {
  it('orders by creation time, newest first, without mutating the input', () => {
    const input = [
      app('applied', '', '2026-10-01T10:00:00.000Z'),
      app('applied', '', '2026-10-05T10:00:00.000Z'),
      app('applied', '', '2026-09-30T10:00:00.000Z'),
    ];
    const sorted = sortByNewest(input);
    expect(sorted.map((item) => item.createdAt.slice(0, 10))).toEqual(['2026-10-05', '2026-10-01', '2026-09-30']);
    expect(input[0].createdAt.slice(0, 10)).toBe('2026-10-01');
  });
});

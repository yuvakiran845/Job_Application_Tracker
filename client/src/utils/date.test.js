import { describe, expect, it } from 'vitest';
import { addDays, formatTimeAgo, parseISODate, toISODate } from './date';

describe('parseISODate', () => {
  it('parses a date-only string as local midnight', () => {
    const date = parseISODate('2026-03-09');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 2, 9, 0]);
  });

  it.each(['', '2026-3-9', '2026-02-30', '2026-13-01', 'yesterday', null, undefined])(
    'returns null for %s',
    (value) => {
      expect(parseISODate(value)).toBeNull();
    },
  );
});

describe('toISODate / addDays', () => {
  it('round-trips through parseISODate', () => {
    expect(toISODate(parseISODate('2026-12-31'))).toBe('2026-12-31');
  });

  it('crosses month and year boundaries', () => {
    expect(toISODate(addDays(parseISODate('2026-12-30'), 3))).toBe('2027-01-02');
    expect(toISODate(addDays(parseISODate('2026-03-01'), -1))).toBe('2026-02-28');
  });
});

describe('formatTimeAgo', () => {
  const now = new Date(2026, 9, 12, 9, 0);
  const at = (year, month, day, hour = 12) => new Date(year, month, day, hour).toISOString();

  it('counts local calendar days, then weeks, months and years', () => {
    expect(formatTimeAgo(at(2026, 9, 12, 8), now, 'en')).toBe('Today');
    expect(formatTimeAgo(at(2026, 9, 11, 23), now, 'en')).toBe('Yesterday');
    expect(formatTimeAgo(at(2026, 9, 10), now, 'en')).toBe('2 days ago');
    expect(formatTimeAgo(at(2026, 9, 5), now, 'en')).toBe('Last week');
    expect(formatTimeAgo(at(2026, 8, 20), now, 'en')).toBe('3 weeks ago');
    expect(formatTimeAgo(at(2026, 6, 12), now, 'en')).toBe('3 months ago');
    expect(formatTimeAgo(at(2024, 9, 1), now, 'en')).toBe('2 years ago');
  });

  it('never says "in the future" for clock differences', () => {
    expect(formatTimeAgo(at(2026, 9, 13), now, 'en')).toBe('Today');
  });
});

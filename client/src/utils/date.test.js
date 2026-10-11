import { describe, expect, it } from 'vitest';
import { addDays, parseISODate, toISODate } from './date';

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

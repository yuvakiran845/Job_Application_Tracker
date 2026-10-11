import { describe, expect, it } from 'vitest';
import { SOURCE_VALUES, STATUS_VALUES } from '../src/constants/applications.js';
import { computeAnalytics } from '../src/services/analyticsService.js';

// Deterministic pseudo-random numbers so a failure is reproducible.
function mulberry32(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDay(base, offset) {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

describe('analytics accuracy (randomized cross-check against brute force)', () => {
  it.each([1, 7, 42, 2026])('matches direct counting for seed %i', (seed) => {
    const random = mulberry32(seed);
    const pick = (list) => list[Math.floor(random() * list.length)];
    const base = Date.UTC(2025, 0, 1);

    const all = Array.from({ length: 300 }, () => ({
      status: pick(STATUS_VALUES),
      appliedDate: isoDay(base, Math.floor(random() * 640)),
      source: random() < 0.2 ? '' : pick(SOURCE_VALUES),
    }));
    const from = isoDay(base, Math.floor(random() * 300));
    const to = isoDay(base, 300 + Math.floor(random() * 340));
    // The service receives only records inside the range (the database query does this).
    const records = all.filter((record) => record.appliedDate >= from && record.appliedDate <= to);

    const result = computeAnalytics(records, { from, to });
    const count = (statuses) => records.filter((record) => statuses.includes(record.status)).length;

    expect(result.totals.submitted).toBe(records.length);
    expect(result.totals.responded).toBe(count(['assessment', 'interview', 'offer', 'rejected']));
    expect(result.totals.reachedInterview).toBe(count(['interview', 'offer']));
    expect(result.rates.offer).toBeCloseTo(count(['offer']) / records.length, 10);
    for (const status of STATUS_VALUES) expect(result.byStatus[status]).toBe(count([status]));
    expect(result.bySource.reduce((sum, item) => sum + item.count, 0)).toBe(records.length);

    // Every record lands in exactly one bucket; buckets are contiguous and sorted.
    expect(result.overTime.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(records.length);
    const starts = result.overTime.map((bucket) => bucket.start);
    expect([...starts].sort()).toEqual(starts);
    expect(new Set(starts).size).toBe(starts.length);
    expect(starts[0] <= from).toBe(true);
    expect(starts.at(-1) <= to).toBe(true);
  });
});

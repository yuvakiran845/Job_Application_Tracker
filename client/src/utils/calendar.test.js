import { describe, expect, it } from 'vitest';
import { computeAnalytics, formatPercent, getPresetRange, startOfWeek } from './analytics';
import { describeDeadline, getEventDay, getMonthGrid, groupEventsByDay, sortEvents, toEventRange } from './calendar';
import { toISODate } from './date';

describe('toEventRange', () => {
  it('covers whole local days, as dates and as UTC instants', () => {
    const range = toEventRange(new Date(2026, 9, 1, 15, 0), new Date(2026, 9, 31, 9, 0));
    expect(range.start).toBe('2026-10-01');
    expect(range.end).toBe('2026-10-31');
    expect(new Date(range.startAt).getTime()).toBe(new Date(2026, 9, 1).getTime()); // local midnight
    expect(new Date(range.endAt).getTime()).toBe(new Date(2026, 10, 1).getTime() - 1); // last ms of Oct 31
  });
});

describe('getMonthGrid', () => {
  it('fills whole Monday-first weeks around the month', () => {
    const { weeks, gridStart, gridEnd } = getMonthGrid(new Date(2026, 9, 15)); // October 2026
    expect(toISODate(gridStart)).toBe('2026-09-28'); // Monday
    expect(toISODate(gridEnd)).toBe('2026-11-01'); // Sunday
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
});

describe('events', () => {
  const interview = (at) => ({ id: at, type: 'interview', at, application: {} });
  const deadline = (date) => ({ id: date, type: 'deadline', date, application: {} });

  it('places interviews on their local day and deadlines first on theirs', () => {
    const morning = new Date(2026, 9, 14, 9, 0).toISOString();
    const afternoon = new Date(2026, 9, 14, 15, 0).toISOString();
    const sorted = sortEvents([interview(afternoon), deadline('2026-10-14'), interview(morning), deadline('2026-10-13')]);
    expect(sorted.map((event) => event.id)).toEqual(['2026-10-13', '2026-10-14', morning, afternoon]);
    expect(getEventDay(interview(morning))).toBe('2026-10-14');
    expect([...groupEventsByDay(sorted).keys()]).toEqual(['2026-10-13', '2026-10-14']);
  });

  it('labels deadlines by stage', () => {
    expect(describeDeadline('saved')).toBe('Application deadline');
    expect(describeDeadline('assessment')).toBe('Assessment due');
    expect(describeDeadline('offer')).toBe('Offer response due');
    expect(describeDeadline('interview')).toBe('Deadline');
  });
});

describe('analytics helpers (mirror of the API)', () => {
  it('matches the server definitions', () => {
    const result = computeAnalytics(
      [
        { status: 'applied', appliedDate: '2026-09-01' },
        { status: 'interview', appliedDate: '2026-09-10' },
        { status: 'offer', appliedDate: '2026-09-12' },
        { status: 'rejected', appliedDate: '2026-09-20' },
      ],
      { from: '2026-09-01', to: '2026-09-20' },
    );
    expect(result.rates).toEqual({ response: 0.75, interview: 0.5, offer: 0.25 });
    expect(result.overTime.map((bucket) => bucket.start)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14']);
  });

  it('builds preset ranges in local dates', () => {
    const now = new Date(2026, 9, 11, 12);
    expect(getPresetRange('30d', now)).toEqual({ from: '2026-09-12', to: '2026-10-11' });
    expect(getPresetRange('12m', now)).toEqual({ from: '2025-11-01', to: '2026-10-11' });
    expect(getPresetRange('all', now)).toEqual({ from: '', to: '' });
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05');
  });

  it('formats rates, showing a dash when there is nothing to divide by', () => {
    expect(formatPercent(0.625)).toBe('63%');
    expect(formatPercent(null)).toBe('—');
  });
});

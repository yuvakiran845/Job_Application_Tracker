import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUERY,
  countActiveFilters,
  filterApplications,
  parseApplicationQuery,
  queryApplications,
  sortApplications,
  toSearchParams,
} from './applicationQuery';

let sequence = 0;
function app(overrides) {
  sequence += 1;
  return {
    id: `app-${sequence}`,
    company: 'Company',
    jobTitle: 'Engineer',
    location: 'Remote',
    status: 'applied',
    appliedDate: '2026-09-01',
    deadline: '',
    createdAt: `2026-09-${String(sequence).padStart(2, '0')}T10:00:00.000Z`,
    ...overrides,
  };
}

const query = (overrides) => ({ ...DEFAULT_QUERY, ...overrides });
const companies = (list) => list.map((item) => item.company);

describe('filterApplications', () => {
  const list = [
    app({ company: 'Northwind Labs', jobTitle: 'Frontend Engineer', location: 'Bengaluru, India', status: 'interview', appliedDate: '2026-09-10' }),
    app({ company: 'Zürich Data', jobTitle: 'Data Analyst', location: 'Zürich, Switzerland', status: 'applied', appliedDate: '2026-09-20' }),
    app({ company: 'Fernleaf Studio', jobTitle: 'Design Intern', location: 'Remote', status: 'applied', appliedDate: '2026-10-01' }),
    app({ company: 'Sablewood Games', jobTitle: 'Gameplay Programmer', location: 'Hyderabad, India', status: 'saved', appliedDate: '' }),
  ];

  it('searches company and job title, ignoring case and accents', () => {
    expect(companies(filterApplications(list, query({ q: 'NORTHWIND' })))).toEqual(['Northwind Labs']);
    expect(companies(filterApplications(list, query({ q: 'analyst' })))).toEqual(['Zürich Data']);
    expect(companies(filterApplications(list, query({ q: 'zurich' })))).toEqual(['Zürich Data']);
    expect(filterApplications(list, query({ q: 'bengaluru' }))).toHaveLength(0); // location is not searched
  });

  it('filters by status and by location substring', () => {
    expect(filterApplications(list, query({ status: 'applied' }))).toHaveLength(2);
    expect(companies(filterApplications(list, query({ location: 'india' })))).toEqual(['Northwind Labs', 'Sablewood Games']);
  });

  it('filters by an inclusive applied-date range and excludes records without a date', () => {
    expect(companies(filterApplications(list, query({ from: '2026-09-10', to: '2026-09-20' })))).toEqual([
      'Northwind Labs',
      'Zürich Data',
    ]);
    expect(companies(filterApplications(list, query({ from: '2026-09-15' })))).toEqual(['Zürich Data', 'Fernleaf Studio']);
  });

  it('combines every filter', () => {
    const result = filterApplications(list, query({ q: 'a', status: 'applied', location: 'remote', from: '2026-09-25' }));
    expect(companies(result)).toEqual(['Fernleaf Studio']);
  });
});

describe('sortApplications', () => {
  const list = [
    app({ company: 'beta', status: 'offer', appliedDate: '2026-09-05', deadline: '2026-10-20' }),
    app({ company: 'Alpha', status: 'saved', appliedDate: '', deadline: '' }),
    app({ company: 'gamma 10', status: 'applied', appliedDate: '2026-09-01', deadline: '2026-10-15' }),
    app({ company: 'gamma 9', status: 'interview', appliedDate: '2026-09-09', deadline: '' }),
  ];

  it('sorts company names case-insensitively and numerically', () => {
    expect(companies(sortApplications(list, 'company', 'asc'))).toEqual(['Alpha', 'beta', 'gamma 9', 'gamma 10']);
    expect(companies(sortApplications(list, 'company', 'desc'))).toEqual(['gamma 10', 'gamma 9', 'beta', 'Alpha']);
  });

  it('keeps empty dates last in both directions', () => {
    expect(companies(sortApplications(list, 'deadline', 'asc'))).toEqual(['gamma 10', 'beta', 'gamma 9', 'Alpha']);
    expect(companies(sortApplications(list, 'deadline', 'desc'))).toEqual(['beta', 'gamma 10', 'gamma 9', 'Alpha']);
    expect(companies(sortApplications(list, 'appliedDate', 'desc')).at(-1)).toBe('Alpha');
  });

  it('sorts statuses in pipeline order', () => {
    expect(sortApplications(list, 'status', 'asc').map((item) => item.status)).toEqual([
      'saved',
      'applied',
      'interview',
      'offer',
    ]);
  });

  it('does not mutate the input', () => {
    const before = companies(list);
    sortApplications(list, 'company', 'asc');
    expect(companies(list)).toEqual(before);
  });
});

describe('queryApplications', () => {
  const list = Array.from({ length: 23 }, (_, index) => app({ company: `Company ${index + 1}` }));

  it('paginates and reports the visible range', () => {
    const result = queryApplications(list, query({ sort: 'company', order: 'asc', page: 3, pageSize: 10 }));
    expect(result).toMatchObject({ total: 23, page: 3, pageCount: 3, rangeStart: 21, rangeEnd: 23 });
    expect(companies(result.items)).toEqual(['Company 21', 'Company 22', 'Company 23']);
  });

  it('clamps a page number that is out of range', () => {
    expect(queryApplications(list, query({ page: 99 })).page).toBe(3);
  });

  it('handles an empty result', () => {
    const result = queryApplications(list, query({ q: 'nothing matches' }));
    expect(result).toMatchObject({ items: [], total: 0, page: 1, pageCount: 1, rangeStart: 0, rangeEnd: 0 });
  });
});

describe('URL params', () => {
  it('round-trips a query and omits defaults', () => {
    const original = query({ q: 'react', status: 'interview', from: '2026-09-01', sort: 'company', order: 'asc', page: 2 });
    const params = toSearchParams(original);
    expect(params.toString()).toBe('q=react&status=interview&from=2026-09-01&sort=company&order=asc&page=2');
    expect(parseApplicationQuery(params)).toEqual(original);
    expect(toSearchParams(DEFAULT_QUERY).toString()).toBe('');
  });

  it('replaces invalid values with defaults', () => {
    const parsed = parseApplicationQuery(
      new URLSearchParams('status=ghosted&from=2026-02-30&sort=salary&order=up&page=-4&pageSize=7'),
    );
    expect(parsed).toEqual(DEFAULT_QUERY);
  });

  it('counts active filters', () => {
    expect(countActiveFilters(DEFAULT_QUERY)).toBe(0);
    expect(countActiveFilters(query({ q: 'x', to: '2026-10-01', sort: 'company' }))).toBe(2);
  });
});

import { describe, expect, it } from 'vitest';
import { isHttpUrl, validateApplicationInput } from './validation';

const TODAY = '2026-10-11';

const validInput = {
  company: 'Northwind Labs',
  jobTitle: 'Frontend Engineer',
  location: 'Remote',
  status: 'applied',
  appliedDate: '2026-10-01',
  employmentType: 'full-time',
  source: 'linkedin',
  jobUrl: 'https://jobs.example.com/northwind',
  notes: '',
};

function validate(overrides) {
  return validateApplicationInput({ ...validInput, ...overrides }, { today: TODAY });
}

describe('validateApplicationInput', () => {
  it('accepts a complete, valid application', () => {
    expect(validate({})).toEqual({});
  });

  it('requires company, job title and location, ignoring surrounding whitespace', () => {
    const errors = validate({ company: '   ', jobTitle: '', location: undefined });
    expect(errors.company).toBe('Company is required.');
    expect(errors.jobTitle).toBe('Job title is required.');
    expect(errors.location).toBe('Location is required.');
  });

  it('enforces maximum lengths', () => {
    expect(validate({ company: 'x'.repeat(101) }).company).toMatch(/100 characters or fewer/);
    expect(validate({ notes: 'x'.repeat(2001) }).notes).toMatch(/2000 characters or fewer/);
  });

  it('rejects unknown statuses, employment types and sources', () => {
    const errors = validate({ status: 'ghosted', employmentType: 'gig', source: 'carrier-pigeon' });
    expect(Object.keys(errors).sort()).toEqual(['employmentType', 'source', 'status']);
  });

  it('requires an applied date unless the job is only saved', () => {
    expect(validate({ appliedDate: '' }).appliedDate).toBe('Applied date is required.');
    expect(validate({ appliedDate: '', status: 'saved' })).toEqual({});
  });

  it('rejects impossible, future and implausibly old dates', () => {
    expect(validate({ appliedDate: '2026-02-30' }).appliedDate).toBe('Enter a valid date.');
    expect(validate({ appliedDate: '10/01/2026' }).appliedDate).toBe('Enter a valid date.');
    expect(validate({ appliedDate: '2026-10-12' }).appliedDate).toMatch(/future/);
    expect(validate({ appliedDate: '1999-12-31' }).appliedDate).toMatch(/on or after/);
    expect(validate({ appliedDate: TODAY })).toEqual({});
  });

  it('only accepts http(s) job URLs', () => {
    expect(validate({ jobUrl: 'not a url' }).jobUrl).toMatch(/http:\/\/ or https:\/\//);
    expect(validate({ jobUrl: 'javascript:alert(1)' }).jobUrl).toBeDefined();
    expect(validate({ jobUrl: '' })).toEqual({});
  });
});

describe('isHttpUrl', () => {
  it.each([
    ['https://example.com', true],
    ['http://example.com/path?q=1', true],
    ['ftp://example.com', false],
    ['example.com', false],
    ['javascript:alert(1)', false],
  ])('%s → %s', (value, expected) => {
    expect(isHttpUrl(value)).toBe(expected);
  });
});

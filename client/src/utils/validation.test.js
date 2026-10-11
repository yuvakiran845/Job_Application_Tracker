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
  salaryRange: '₹14–18 LPA',
  deadline: '2026-10-20',
  interviewDate: '2026-10-14T05:00:00.000Z',
  contact: { name: 'Priya Raman', email: 'priya@example.com', phone: '+91 80 5550 1234' },
  notes: '',
};

function validate(overrides) {
  return validateApplicationInput({ ...validInput, ...overrides }, { today: TODAY });
}

describe('validateApplicationInput', () => {
  it('accepts a complete, valid application', () => {
    expect(validate({})).toEqual({});
  });

  it('accepts the minimum required fields', () => {
    const minimal = { company: 'A', jobTitle: 'B', location: 'C', status: 'saved' };
    expect(validateApplicationInput(minimal, { today: TODAY })).toEqual({});
  });

  it('requires company, job title and location, ignoring surrounding whitespace', () => {
    const errors = validate({ company: '   ', jobTitle: '', location: undefined });
    expect(errors.company).toBe('Company is required.');
    expect(errors.jobTitle).toBe('Job title is required.');
    expect(errors.location).toBe('Location is required.');
  });

  it('enforces maximum lengths', () => {
    expect(validate({ company: 'x'.repeat(101) }).company).toMatch(/100 characters or fewer/);
    expect(validate({ salaryRange: 'x'.repeat(101) }).salaryRange).toMatch(/100 characters or fewer/);
    expect(validate({ notes: 'x'.repeat(2001) }).notes).toMatch(/2000 characters or fewer/);
  });

  it('rejects unknown statuses, employment types and sources', () => {
    const errors = validate({ status: 'ghosted', employmentType: 'gig', source: 'carrier-pigeon' });
    expect(Object.keys(errors).sort()).toEqual(['employmentType', 'source', 'status']);
  });

  it('requires an applied date only for submitted statuses', () => {
    for (const status of ['applied', 'assessment', 'interview', 'offer', 'rejected']) {
      expect(validate({ status, appliedDate: '' }).appliedDate).toMatch(/required/);
    }
    expect(validate({ status: 'saved', appliedDate: '' })).toEqual({});
    expect(validate({ status: 'withdrawn', appliedDate: '' })).toEqual({});
  });

  it('rejects impossible, future and implausibly old applied dates', () => {
    expect(validate({ appliedDate: '2026-02-30' }).appliedDate).toBe('Enter a valid date.');
    expect(validate({ appliedDate: '10/01/2026' }).appliedDate).toBe('Enter a valid date.');
    expect(validate({ appliedDate: '2026-10-12' }).appliedDate).toMatch(/future/);
    expect(validate({ appliedDate: '1999-12-31' }).appliedDate).toMatch(/on or after/);
    expect(validate({ appliedDate: TODAY })).toEqual({});
  });

  it('allows future deadlines but rejects invalid ones', () => {
    expect(validate({ deadline: '2027-01-15' })).toEqual({});
    expect(validate({ deadline: '2026-13-01' }).deadline).toBe('Enter a valid date.');
  });

  it('requires interview dates to be full ISO date-times', () => {
    expect(validate({ interviewDate: '2026-10-14T10:30:00+05:30' })).toEqual({});
    expect(validate({ interviewDate: '2026-10-14' }).interviewDate).toBe('Enter a valid date and time.');
    expect(validate({ interviewDate: 'next tuesday' }).interviewDate).toBeDefined();
  });

  it('validates optional contact email and phone', () => {
    expect(validate({ contact: { email: 'not-an-email' } })['contact.email']).toBe('Enter a valid email address.');
    expect(validate({ contact: { phone: 'call me' } })['contact.phone']).toBe('Enter a valid phone number.');
    expect(validate({ contact: { name: '', email: '', phone: '' } })).toEqual({});
    expect(validate({ contact: undefined })).toEqual({});
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

import { describe, expect, it } from 'vitest';
import { createApplicationRecord, fromFormValues, getStatusChange, toFormValues } from './applicationModel';
import { validateApplicationInput } from './validation';

describe('getStatusChange', () => {
  const TODAY = '2026-10-11';

  it('records today as the applied date when a saved job is submitted', () => {
    expect(getStatusChange({ status: 'saved', appliedDate: '' }, 'applied', TODAY)).toEqual({
      status: 'applied',
      appliedDate: TODAY,
    });
  });

  it('keeps an existing applied date', () => {
    expect(getStatusChange({ status: 'applied', appliedDate: '2026-09-01' }, 'interview', TODAY)).toEqual({
      status: 'interview',
    });
  });

  it('does not add a date when withdrawing a job that was never applied to', () => {
    expect(getStatusChange({ status: 'saved', appliedDate: '' }, 'withdrawn', TODAY)).toEqual({ status: 'withdrawn' });
  });
});

describe('form value conversion', () => {
  it('round-trips a record through the form, converting the interview time via local time', () => {
    const record = createApplicationRecord({
      company: 'Northwind Labs',
      jobTitle: 'Frontend Engineer',
      location: 'Remote',
      status: 'interview',
      appliedDate: '2026-10-01',
      interviewDate: new Date(2026, 9, 14, 10, 30).toISOString(),
      contact: { name: 'Priya' },
    });

    const formValues = toFormValues(record);
    expect(formValues.interviewDate).toBe('2026-10-14T10:30');
    expect(formValues.contact).toEqual({ name: 'Priya', email: '', phone: '' });

    const input = fromFormValues(formValues);
    expect(input.interviewDate).toBe(record.interviewDate);
    expect(validateApplicationInput(input, { today: '2026-10-11' })).toEqual({});
  });

  it('keeps an empty interview time empty', () => {
    expect(fromFormValues({ interviewDate: '' }).interviewDate).toBe('');
  });
});

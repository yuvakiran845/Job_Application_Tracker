import { STATUS_BY_VALUE } from '../constants/applications';
import { fromLocalDateTimeInput, toLocalDateTimeInput } from './date';
import { createId } from './format';

// The client-side shape of an application. Field names match the planned
// Mongoose model (Level 4); the API will expose Mongo's _id as `id`.

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function createApplicationRecord(input, { id = createId(), now = new Date() } = {}) {
  const timestamp = now.toISOString();
  const contact = input.contact ?? {};

  return {
    id,
    company: text(input.company),
    jobTitle: text(input.jobTitle),
    location: text(input.location),
    jobUrl: text(input.jobUrl),
    employmentType: text(input.employmentType),
    salaryRange: text(input.salaryRange),
    source: text(input.source),
    appliedDate: text(input.appliedDate),
    status: input.status,
    deadline: text(input.deadline),
    interviewDate: text(input.interviewDate),
    contact: {
      name: text(contact.name),
      email: text(contact.email),
      phone: text(contact.phone),
    },
    notes: text(input.notes),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

// ---- Form values ------------------------------------------------------------
// Form values mirror the record shape, except interviewDate holds the local
// "YYYY-MM-DDTHH:mm" string used by <input type="datetime-local">.

export function getDefaultFormValues(today) {
  return {
    company: '',
    jobTitle: '',
    location: '',
    employmentType: 'full-time',
    jobUrl: '',
    salaryRange: '',
    source: '',
    status: 'applied',
    appliedDate: today,
    deadline: '',
    interviewDate: '',
    contact: { name: '', email: '', phone: '' },
    notes: '',
  };
}

export function toFormValues(application) {
  return {
    company: application.company,
    jobTitle: application.jobTitle,
    location: application.location,
    employmentType: application.employmentType,
    jobUrl: application.jobUrl,
    salaryRange: application.salaryRange,
    source: application.source,
    status: application.status,
    appliedDate: application.appliedDate,
    deadline: application.deadline,
    interviewDate: toLocalDateTimeInput(application.interviewDate),
    contact: { ...application.contact },
    notes: application.notes,
  };
}

export function fromFormValues(values) {
  return { ...values, interviewDate: fromLocalDateTimeInput(values.interviewDate) };
}

// ---- Status changes -----------------------------------------------------------

/**
 * Fields to update when an application moves to `nextStatus`. Moving a job that
 * was never applied to into a submitted status records today as the applied date.
 */
export function getStatusChange(application, nextStatus, today) {
  const changes = { status: nextStatus };
  if (!application.appliedDate && STATUS_BY_VALUE[nextStatus]?.requiresAppliedDate) {
    changes.appliedDate = today;
  }
  return changes;
}

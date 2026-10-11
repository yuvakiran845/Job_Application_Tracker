import { createId } from './format';

// The client-side shape of an application. Field names match the planned
// Mongoose model (Level 4); the API will expose Mongo's _id as `id`.

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getDefaultApplicationValues(today) {
  return {
    company: '',
    jobTitle: '',
    location: '',
    status: 'applied',
    appliedDate: today,
    employmentType: 'full-time',
    source: '',
    jobUrl: '',
    notes: '',
  };
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

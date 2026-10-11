import {
  APPLICATION_SOURCES,
  EMPLOYMENT_TYPES,
  FIELD_LIMITS,
  MIN_DATE,
  STATUS_BY_VALUE,
} from '../constants/applications';
import { formatDate, isISODateTime, parseISODate, todayISO } from './date';

const EMPLOYMENT_TYPE_VALUES = EMPLOYMENT_TYPES.map((option) => option.value);
const SOURCE_VALUES = APPLICATION_SOURCES.map((option) => option.value);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{5,}$/;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function checkLength(errors, field, value, label, limit) {
  if (value.length > limit) errors[field] = `${label} must be ${limit} characters or fewer.`;
}

function checkRequiredText(errors, field, value, label) {
  if (!value) {
    errors[field] = `${label} is required.`;
  } else {
    checkLength(errors, field, value, label, FIELD_LIMITS[field]);
  }
}

function checkOptionalDate(errors, field, value, label) {
  if (!parseISODate(value)) {
    errors[field] = 'Enter a valid date.';
  } else if (value < MIN_DATE) {
    errors[field] = `${label} must be on or after ${formatDate(MIN_DATE)}.`;
  }
}

/**
 * Validates an application (create or full update).
 * Returns an object keyed by field path (e.g. "contact.email"); an empty object
 * means the input is valid. The server will apply equivalent rules (Level 3) —
 * client-side validation is for user experience, not security.
 */
export function validateApplicationInput(input, { today = todayISO() } = {}) {
  const errors = {};

  checkRequiredText(errors, 'company', text(input.company), 'Company');
  checkRequiredText(errors, 'jobTitle', text(input.jobTitle), 'Job title');
  checkRequiredText(errors, 'location', text(input.location), 'Location');

  const status = STATUS_BY_VALUE[input.status];
  if (!status) errors.status = 'Choose a status.';

  const appliedDate = text(input.appliedDate);
  if (!appliedDate) {
    if (status?.requiresAppliedDate) errors.appliedDate = 'Applied date is required for this status.';
  } else {
    checkOptionalDate(errors, 'appliedDate', appliedDate, 'Applied date');
    if (!errors.appliedDate && appliedDate > today) errors.appliedDate = 'Applied date can’t be in the future.';
  }

  const deadline = text(input.deadline);
  if (deadline) checkOptionalDate(errors, 'deadline', deadline, 'Deadline');

  const interviewDate = text(input.interviewDate);
  if (interviewDate && !isISODateTime(interviewDate)) {
    errors.interviewDate = 'Enter a valid date and time.';
  }

  const employmentType = text(input.employmentType);
  if (employmentType && !EMPLOYMENT_TYPE_VALUES.includes(employmentType)) {
    errors.employmentType = 'Choose a valid employment type.';
  }

  const source = text(input.source);
  if (source && !SOURCE_VALUES.includes(source)) {
    errors.source = 'Choose a valid source.';
  }

  const jobUrl = text(input.jobUrl);
  if (jobUrl) {
    if (jobUrl.length > FIELD_LIMITS.jobUrl) {
      errors.jobUrl = `Job URL must be ${FIELD_LIMITS.jobUrl} characters or fewer.`;
    } else if (!isHttpUrl(jobUrl)) {
      errors.jobUrl = 'Enter a full URL starting with http:// or https://.';
    }
  }

  checkLength(errors, 'salaryRange', text(input.salaryRange), 'Salary range', FIELD_LIMITS.salaryRange);
  checkLength(errors, 'notes', text(input.notes), 'Notes', FIELD_LIMITS.notes);

  const contact = input.contact ?? {};
  checkLength(errors, 'contact.name', text(contact.name), 'Contact name', FIELD_LIMITS.contactName);

  const email = text(contact.email);
  if (email) {
    if (email.length > FIELD_LIMITS.contactEmail || !EMAIL_PATTERN.test(email)) {
      errors['contact.email'] = 'Enter a valid email address.';
    }
  }

  const phone = text(contact.phone);
  if (phone) {
    if (phone.length > FIELD_LIMITS.contactPhone || !PHONE_PATTERN.test(phone)) {
      errors['contact.phone'] = 'Enter a valid phone number.';
    }
  }

  return errors;
}

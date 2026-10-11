import {
  APPLICATION_SOURCES,
  EMPLOYMENT_TYPES,
  FIELD_LIMITS,
  MIN_APPLIED_DATE,
  STATUS_VALUES,
} from '../constants/applications';
import { formatDate, parseISODate, todayISO } from './date';

const EMPLOYMENT_TYPE_VALUES = EMPLOYMENT_TYPES.map((option) => option.value);
const SOURCE_VALUES = APPLICATION_SOURCES.map((option) => option.value);

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

function checkRequiredText(errors, field, value, label) {
  if (!value) {
    errors[field] = `${label} is required.`;
  } else if (value.length > FIELD_LIMITS[field]) {
    errors[field] = `${label} must be ${FIELD_LIMITS[field]} characters or fewer.`;
  }
}

/**
 * Validates the fields of a new or edited application.
 * Returns an object keyed by field name; an empty object means the input is valid.
 * The server will apply equivalent rules (Level 3) — this is not a security boundary.
 */
export function validateApplicationInput(input, { today = todayISO() } = {}) {
  const errors = {};

  checkRequiredText(errors, 'company', text(input.company), 'Company');
  checkRequiredText(errors, 'jobTitle', text(input.jobTitle), 'Job title');
  checkRequiredText(errors, 'location', text(input.location), 'Location');

  if (!STATUS_VALUES.includes(input.status)) {
    errors.status = 'Choose a status.';
  }

  const appliedDate = text(input.appliedDate);
  if (!appliedDate) {
    // A saved job has not been applied to yet, so the date is optional.
    if (input.status !== 'saved') errors.appliedDate = 'Applied date is required.';
  } else if (!parseISODate(appliedDate)) {
    errors.appliedDate = 'Enter a valid date.';
  } else if (appliedDate > today) {
    errors.appliedDate = 'Applied date can’t be in the future.';
  } else if (appliedDate < MIN_APPLIED_DATE) {
    errors.appliedDate = `Applied date must be on or after ${formatDate(MIN_APPLIED_DATE)}.`;
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

  if (text(input.notes).length > FIELD_LIMITS.notes) {
    errors.notes = `Notes must be ${FIELD_LIMITS.notes} characters or fewer.`;
  }

  return errors;
}

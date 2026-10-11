// Shared vocabulary for job applications. Values mirror the enums the Mongoose
// model will enforce in Level 4, so the UI and API speak the same language.

export const APPLICATION_STATUSES = [
  { value: 'saved', label: 'Saved', tone: 'neutral' },
  { value: 'applied', label: 'Applied', tone: 'brand' },
  { value: 'assessment', label: 'Assessment', tone: 'warning' },
  { value: 'interview', label: 'Interview', tone: 'violet' },
  { value: 'offer', label: 'Offer', tone: 'success' },
  { value: 'rejected', label: 'Rejected', tone: 'danger' },
  { value: 'withdrawn', label: 'Withdrawn', tone: 'muted' },
];

export const STATUS_VALUES = APPLICATION_STATUSES.map((status) => status.value);

export const STATUS_BY_VALUE = Object.fromEntries(
  APPLICATION_STATUSES.map((status) => [status.value, status]),
);

export const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'internship', label: 'Internship' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'freelance', label: 'Freelance' },
];

export const APPLICATION_SOURCES = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'company-website', label: 'Company website' },
  { value: 'referral', label: 'Referral' },
  { value: 'job-board', label: 'Job board' },
  { value: 'campus', label: 'Campus placement' },
  { value: 'recruiter', label: 'Recruiter outreach' },
  { value: 'other', label: 'Other' },
];

export const FIELD_LIMITS = {
  company: 100,
  jobTitle: 120,
  location: 100,
  jobUrl: 2048,
  notes: 2000,
};

// Earliest applied date accepted; catches typos such as "0225" for the year.
export const MIN_APPLIED_DATE = '2000-01-01';

export function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? '';
}

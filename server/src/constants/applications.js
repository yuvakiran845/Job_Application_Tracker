// Allowed values and limits for applications. Mirrors client/src/constants/applications.js
// so both sides validate the same way; the server is the source of truth.

export const STATUS_VALUES = ['saved', 'applied', 'assessment', 'interview', 'offer', 'rejected', 'withdrawn'];

// Statuses that mean the application was submitted, so an applied date is required.
export const STATUSES_REQUIRING_APPLIED_DATE = ['applied', 'assessment', 'interview', 'offer', 'rejected'];

export const EMPLOYMENT_TYPE_VALUES = ['full-time', 'part-time', 'internship', 'contract', 'temporary', 'freelance'];

export const SOURCE_VALUES = ['linkedin', 'company-website', 'referral', 'job-board', 'campus', 'recruiter', 'other'];

export const SORT_FIELDS = ['createdAt', 'appliedDate', 'company', 'deadline', 'status'];

export const FIELD_LIMITS = {
  company: 100,
  jobTitle: 120,
  location: 100,
  jobUrl: 2048,
  salaryRange: 100,
  notes: 2000,
  contactName: 100,
  contactEmail: 254,
  contactPhone: 30,
};

export const MIN_DATE = '2000-01-01';

export const PAGE_SIZE_DEFAULT = 10;
export const PAGE_SIZE_MAX = 100;

// Human-readable labels, used in CSV exports.
export const STATUS_LABELS = {
  saved: 'Saved',
  applied: 'Applied',
  assessment: 'Assessment',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const EMPLOYMENT_TYPE_LABELS = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  internship: 'Internship',
  contract: 'Contract',
  temporary: 'Temporary',
  freelance: 'Freelance',
};

export const SOURCE_LABELS = {
  linkedin: 'LinkedIn',
  'company-website': 'Company website',
  referral: 'Referral',
  'job-board': 'Job board',
  campus: 'Campus placement',
  recruiter: 'Recruiter outreach',
  other: 'Other',
};

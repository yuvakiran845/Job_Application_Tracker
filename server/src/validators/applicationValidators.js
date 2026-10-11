import { z } from 'zod';
import {
  EMPLOYMENT_TYPE_VALUES,
  FIELD_LIMITS,
  MIN_DATE,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  SORT_FIELDS,
  SOURCE_VALUES,
  STATUS_VALUES,
} from '../constants/applications.js';
import { isCalendarDate, isIsoDateTime } from '../utils/dates.js';

// Messages match the client's so users see the same wording either way.
// z.object() strips unknown keys, so clients can never set userId, _id or timestamps.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{5,}$/;

function text(label) {
  return z.string({
    error: (issue) => (issue.input === undefined ? `${label} is required.` : `${label} must be text.`),
  });
}

function requiredText(label, max) {
  return text(label)
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);
}

function optionalText(label, max) {
  return text(label).trim().max(max, `${label} must be ${max} characters or fewer.`);
}

/** Empty string, or a value accepted by `test`. */
function optionalPattern(label, max, test, message) {
  return optionalText(label, max).refine((value) => value === '' || test(value), message);
}

function optionalCalendarDate(label) {
  return text(label)
    .trim()
    .refine((value) => value === '' || isCalendarDate(value), 'Enter a valid date.')
    .refine((value) => value === '' || value >= MIN_DATE, `${label} must be on or after ${MIN_DATE}.`);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const statusSchema = z.enum(STATUS_VALUES, { error: 'Choose a status.' });

// Accepts an ISO 8601 date-time (or empty/null to clear) and stores it as a Date.
const interviewDateSchema = z
  .union([z.literal(''), z.null(), z.string().trim()], { error: 'Enter a valid date and time.' })
  .refine((value) => !value || isIsoDateTime(value), 'Enter a valid date and time.')
  .transform((value) => (value ? new Date(value) : null));

const contactSchema = z
  .object(
    {
      name: optionalText('Contact name', FIELD_LIMITS.contactName),
      email: optionalPattern(
        'Email',
        FIELD_LIMITS.contactEmail,
        (value) => EMAIL_PATTERN.test(value),
        'Enter a valid email address.',
      ),
      phone: optionalPattern(
        'Phone',
        FIELD_LIMITS.contactPhone,
        (value) => PHONE_PATTERN.test(value),
        'Enter a valid phone number.',
      ),
    },
    { error: 'Contact must be an object.' },
  )
  .partial();

const applicationFields = {
  company: requiredText('Company', FIELD_LIMITS.company),
  jobTitle: requiredText('Job title', FIELD_LIMITS.jobTitle),
  location: requiredText('Location', FIELD_LIMITS.location),
  jobUrl: optionalPattern(
    'Job URL',
    FIELD_LIMITS.jobUrl,
    isHttpUrl,
    'Enter a full URL starting with http:// or https://.',
  ),
  employmentType: z.enum(['', ...EMPLOYMENT_TYPE_VALUES], { error: 'Choose a valid employment type.' }),
  salaryRange: optionalText('Salary range', FIELD_LIMITS.salaryRange),
  source: z.enum(['', ...SOURCE_VALUES], { error: 'Choose a valid source.' }),
  status: statusSchema,
  appliedDate: optionalCalendarDate('Applied date'),
  deadline: optionalCalendarDate('Deadline'),
  interviewDate: interviewDateSchema,
  contact: contactSchema,
  notes: optionalText('Notes', FIELD_LIMITS.notes),
};

const requiredOnCreate = ['company', 'jobTitle', 'location', 'status'];

/** POST body: required fields must be present; everything else is optional. */
export const createApplicationSchema = z.object(applicationFields, { error: 'Request body must be a JSON object.' }).partial(
  Object.fromEntries(
    Object.keys(applicationFields)
      .filter((key) => !requiredOnCreate.includes(key))
      .map((key) => [key, true]),
  ),
);

/** PUT body: any subset of fields; the merged record is validated again in the service. */
export const updateApplicationSchema = z
  .object(applicationFields, { error: 'Request body must be a JSON object.' })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update.');

const optionalQueryDate = z
  .string()
  .trim()
  .refine((value) => value === '' || isCalendarDate(value), 'Use the format YYYY-MM-DD.')
  .default('');

/** GET /applications query string. Same parameter names as the client's URL. */
export const listQuerySchema = z.object({
  q: z.string().trim().max(100, 'Search must be 100 characters or fewer.').default(''),
  status: z.enum(['', ...STATUS_VALUES], { error: 'Choose a valid status.' }).default(''),
  location: z.string().trim().max(100, 'Location must be 100 characters or fewer.').default(''),
  from: optionalQueryDate,
  to: optionalQueryDate,
  sort: z.enum(SORT_FIELDS, { error: `Sort must be one of: ${SORT_FIELDS.join(', ')}.` }).default('createdAt'),
  order: z.enum(['asc', 'desc'], { error: 'Order must be asc or desc.' }).default('desc'),
  page: z.coerce.number({ error: 'Page must be a number.' }).int().min(1, 'Page must be 1 or more.').default(1),
  pageSize: z.coerce
    .number({ error: 'Page size must be a number.' })
    .int()
    .min(1, 'Page size must be 1 or more.')
    .max(PAGE_SIZE_MAX, `Page size must be ${PAGE_SIZE_MAX} or less.`)
    .default(PAGE_SIZE_DEFAULT),
});

/** GET /applications/stats query string. */
export const statsQuerySchema = z.object({
  // Start of the "applied recently" window, as the client's local calendar date.
  appliedSince: optionalQueryDate,
});

export const idParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid application ID.'),
});

/** GET /applications/export: the list filters and sort, without paging. */
export const exportQuerySchema = listQuerySchema.omit({ page: true, pageSize: true });

/** GET /applications/analytics: optional applied-date range. */
export const analyticsQuerySchema = z
  .object({ from: optionalQueryDate, to: optionalQueryDate })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'The start date must be on or before the end date.',
    path: ['from'],
  });

const MAX_EVENT_RANGE_DAYS = 400;
const requiredQueryDate = (label) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .refine(isCalendarDate, `${label} must use the format YYYY-MM-DD.`);
const requiredQueryInstant = (label) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .refine(isIsoDateTime, `${label} must be an ISO 8601 date and time.`);

/**
 * GET /applications/events: the client's local date range, both as calendar dates
 * (for deadlines) and as instants (for interview times), so time zones are exact.
 */
export const eventsQuerySchema = z
  .object({
    start: requiredQueryDate('start'),
    end: requiredQueryDate('end'),
    startAt: requiredQueryInstant('startAt'),
    endAt: requiredQueryInstant('endAt'),
  })
  .superRefine((query, ctx) => {
    if (query.end < query.start) ctx.addIssue({ code: 'custom', path: ['end'], message: 'end must be on or after start.' });
    if (Date.parse(query.endAt) < Date.parse(query.startAt)) {
      ctx.addIssue({ code: 'custom', path: ['endAt'], message: 'endAt must be on or after startAt.' });
    }
    const days = (Date.parse(`${query.end}T00:00:00Z`) - Date.parse(`${query.start}T00:00:00Z`)) / 86_400_000;
    if (days > MAX_EVENT_RANGE_DAYS) {
      ctx.addIssue({ code: 'custom', path: ['end'], message: `The range can be at most ${MAX_EVENT_RANGE_DAYS} days.` });
    }
  });

// Saved views store filters as a normalized query string (no page number).
const VIEW_QUERY_KEYS = ['q', 'status', 'location', 'from', 'to', 'sort', 'order', 'pageSize'];
const VIEW_QUERY_DEFAULTS = { sort: 'createdAt', order: 'desc', pageSize: PAGE_SIZE_DEFAULT };

/** Validates a list query string with the list endpoint's rules and returns it normalized. */
export const savedViewSchema = z.object(
  {
    name: z
      .string({ error: 'Name is required.' })
      .trim()
      .min(1, 'Name is required.')
      .max(40, 'Name must be 40 characters or fewer.'),
    query: z
      .string({ error: 'Query must be text.' })
      .max(1000, 'This view has too many filters to save.')
      .transform((value, ctx) => {
        const parsed = listQuerySchema.safeParse(Object.fromEntries(new URLSearchParams(value)));
        if (!parsed.success) {
          ctx.addIssue({ code: 'custom', message: 'These filters aren’t valid.' });
          return z.NEVER;
        }
        const params = new URLSearchParams();
        for (const key of VIEW_QUERY_KEYS) {
          const item = parsed.data[key];
          if (item !== '' && item !== VIEW_QUERY_DEFAULTS[key]) params.set(key, String(item));
        }
        return params.toString();
      }),
  },
  { error: 'Request body must be a JSON object.' },
);

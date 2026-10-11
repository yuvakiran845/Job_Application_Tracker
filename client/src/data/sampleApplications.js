/**
 * DEVELOPMENT-ONLY SAMPLE DATA
 *
 * Seeds the in-memory mock in services/applicationService.js until the real API
 * is connected (Level 6). Companies are fictional and links use the reserved
 * example.com domain. Never present this as a real user's data.
 *
 * Dates are generated relative to "now" so the dashboard stays meaningful
 * whenever the app is opened.
 */
import { createApplicationRecord } from '../utils/applicationModel';
import { addDays, toISODate } from '../utils/date';

const SAMPLE_ROWS = [
  {
    company: 'Northwind Labs',
    jobTitle: 'Frontend Engineer',
    location: 'Bengaluru, India',
    employmentType: 'full-time',
    source: 'linkedin',
    status: 'interview',
    appliedDaysAgo: 12,
    notes: 'Technical round with the platform team. Revise React performance topics.',
  },
  {
    company: 'Lumenfield Analytics',
    jobTitle: 'Data Analyst',
    location: 'Hyderabad, India (Hybrid)',
    employmentType: 'full-time',
    source: 'company-website',
    status: 'assessment',
    appliedDaysAgo: 6,
    notes: 'SQL take-home assessment due within five days.',
  },
  {
    company: 'Brightpath Health',
    jobTitle: 'Software Engineer I',
    location: 'Pune, India',
    employmentType: 'full-time',
    source: 'referral',
    status: 'offer',
    appliedDaysAgo: 34,
    notes: 'Offer received. Compare benefits before replying.',
  },
  {
    company: 'Quillstone Systems',
    jobTitle: 'Backend Developer (Node.js)',
    location: 'Remote',
    employmentType: 'contract',
    source: 'job-board',
    status: 'applied',
    appliedDaysAgo: 3,
  },
  {
    company: 'Harborline Logistics',
    jobTitle: 'Graduate Engineer Trainee',
    location: 'Chennai, India',
    employmentType: 'full-time',
    source: 'campus',
    status: 'rejected',
    appliedDaysAgo: 41,
  },
  {
    company: 'Fernleaf Studio',
    jobTitle: 'UI/UX Design Intern',
    location: 'Remote',
    employmentType: 'internship',
    source: 'linkedin',
    status: 'applied',
    appliedDaysAgo: 9,
  },
  {
    company: 'Tidewater Fintech',
    jobTitle: 'Associate Product Manager',
    location: 'Mumbai, India',
    employmentType: 'full-time',
    source: 'recruiter',
    status: 'interview',
    appliedDaysAgo: 18,
    notes: 'Recruiter mentioned a case-study round next.',
  },
  {
    company: 'Kestrel Mobility',
    jobTitle: 'Full Stack Developer',
    location: 'Gurugram, India',
    employmentType: 'full-time',
    source: 'job-board',
    status: 'rejected',
    appliedDaysAgo: 27,
  },
  {
    company: 'Meridian Cloud',
    jobTitle: 'Cloud Support Engineer',
    location: 'Bengaluru, India',
    employmentType: 'full-time',
    source: 'company-website',
    status: 'withdrawn',
    appliedDaysAgo: 52,
    notes: 'Withdrew after accepting the Brightpath interview process.',
  },
  {
    company: 'Pinecrest Software',
    jobTitle: 'React Developer',
    location: 'Noida, India (Hybrid)',
    employmentType: 'full-time',
    source: 'referral',
    status: 'assessment',
    appliedDaysAgo: 15,
  },
  {
    company: 'Arclight Media',
    jobTitle: 'Software Engineering Intern',
    location: 'Remote',
    employmentType: 'internship',
    source: 'campus',
    status: 'applied',
    appliedDaysAgo: 1,
  },
  {
    company: 'Sablewood Games',
    jobTitle: 'Junior Gameplay Programmer',
    location: 'Hyderabad, India',
    employmentType: 'full-time',
    source: 'other',
    status: 'saved',
    appliedDaysAgo: null,
    addedDaysAgo: 2,
    notes: 'Portfolio review first — apply before the end of the month.',
  },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildSampleApplications(now = new Date()) {
  return SAMPLE_ROWS.map(({ appliedDaysAgo, addedDaysAgo, ...row }, index) => {
    const addedAt = addDays(now, -(addedDaysAgo ?? appliedDaysAgo));
    // Offset by index so records added on the same day keep a stable order.
    addedAt.setMinutes(addedAt.getMinutes() - index);

    return createApplicationRecord(
      {
        ...row,
        appliedDate: appliedDaysAgo == null ? '' : toISODate(addDays(now, -appliedDaysAgo)),
        jobUrl: `https://jobs.example.com/${slugify(row.company)}/${slugify(row.jobTitle)}`,
      },
      { id: `sample-${index + 1}`, now: addedAt },
    );
  });
}

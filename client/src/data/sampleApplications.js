/**
 * DEVELOPMENT-ONLY SAMPLE DATA
 *
 * Seeds the in-memory mock in services/applicationService.js until the real API
 * is connected (Level 6). Companies and people are fictional; links and emails
 * use the reserved example.com domain and phone numbers use the 555-01xx range
 * reserved for fiction. Never present this as a real user's data.
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
    salaryRange: '₹14–18 LPA',
    appliedDaysAgo: 12,
    interviewIn: { days: 2, hour: 10, minute: 30 },
    contact: { name: 'Priya Raman', email: 'priya.raman@example.com' },
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
    deadlineInDays: 3,
    notes: 'SQL take-home assessment.',
  },
  {
    company: 'Brightpath Health',
    jobTitle: 'Software Engineer I',
    location: 'Pune, India',
    employmentType: 'full-time',
    source: 'referral',
    status: 'offer',
    salaryRange: '₹12 LPA + joining bonus',
    appliedDaysAgo: 34,
    deadlineInDays: 9,
    contact: { name: 'Arjun Mehta', email: 'arjun.mehta@example.com' },
    notes: 'Offer received. Compare benefits before replying.',
  },
  {
    company: 'Quillstone Systems',
    jobTitle: 'Backend Developer (Node.js)',
    location: 'Remote',
    employmentType: 'contract',
    source: 'job-board',
    status: 'applied',
    salaryRange: '$35–45 / hour',
    appliedDaysAgo: 3,
    contact: { name: 'Dana Whitfield', email: 'dana@example.com', phone: '+1 (555) 010-0142' },
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
    interviewIn: { days: 5, hour: 15, minute: 0 },
    contact: { name: 'Meera Nair', email: 'meera.nair@example.com' },
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
    notes: 'Withdrew after moving forward with Brightpath.',
  },
  {
    company: 'Pinecrest Software',
    jobTitle: 'React Developer',
    location: 'Noida, India (Hybrid)',
    employmentType: 'full-time',
    source: 'referral',
    status: 'assessment',
    appliedDaysAgo: 15,
    deadlineInDays: 6,
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
    deadlineInDays: 12,
    notes: 'Portfolio review first, then apply.',
  },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildSampleApplications(now = new Date()) {
  return SAMPLE_ROWS.map(({ appliedDaysAgo, addedDaysAgo, deadlineInDays, interviewIn, ...row }, index) => {
    const addedAt = addDays(now, -(addedDaysAgo ?? appliedDaysAgo));
    // Offset by index so records added on the same day keep a stable order.
    addedAt.setMinutes(addedAt.getMinutes() - index);

    let interviewDate = '';
    if (interviewIn) {
      const interview = addDays(now, interviewIn.days);
      interview.setHours(interviewIn.hour, interviewIn.minute, 0, 0);
      interviewDate = interview.toISOString();
    }

    return createApplicationRecord(
      {
        ...row,
        appliedDate: appliedDaysAgo == null ? '' : toISODate(addDays(now, -appliedDaysAgo)),
        deadline: deadlineInDays == null ? '' : toISODate(addDays(now, deadlineInDays)),
        interviewDate,
        jobUrl: `https://jobs.example.com/${slugify(row.company)}/${slugify(row.jobTitle)}`,
      },
      { id: `sample-${index + 1}`, now: addedAt },
    );
  });
}

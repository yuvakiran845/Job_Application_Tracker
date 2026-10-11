/**
 * DEVELOPMENT-ONLY SEED DATA — fictional companies and people, example.com links,
 * and 555-01xx phone numbers reserved for fiction. Same data as the frontend's
 * sample data. Never run against production (scripts/seed.js refuses to).
 */
import mongoose from 'mongoose';
import { Application } from '../src/models/Application.js';
import { utcDateString } from '../src/utils/dates.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const SAMPLE_ROWS = [
  { company: 'Northwind Labs', jobTitle: 'Frontend Engineer', location: 'Bengaluru, India', employmentType: 'full-time', source: 'linkedin', status: 'interview', salaryRange: '₹14–18 LPA', appliedDaysAgo: 12, interviewInDays: 2, contact: { name: 'Priya Raman', email: 'priya.raman@example.com' }, notes: 'Technical round with the platform team. Revise React performance topics.' },
  { company: 'Lumenfield Analytics', jobTitle: 'Data Analyst', location: 'Hyderabad, India (Hybrid)', employmentType: 'full-time', source: 'company-website', status: 'assessment', appliedDaysAgo: 6, deadlineInDays: 3, notes: 'SQL take-home assessment.' },
  { company: 'Brightpath Health', jobTitle: 'Software Engineer I', location: 'Pune, India', employmentType: 'full-time', source: 'referral', status: 'offer', salaryRange: '₹12 LPA + joining bonus', appliedDaysAgo: 34, deadlineInDays: 9, contact: { name: 'Arjun Mehta', email: 'arjun.mehta@example.com' }, notes: 'Offer received. Compare benefits before replying.' },
  { company: 'Quillstone Systems', jobTitle: 'Backend Developer (Node.js)', location: 'Remote', employmentType: 'contract', source: 'job-board', status: 'applied', salaryRange: '$35–45 / hour', appliedDaysAgo: 3, contact: { name: 'Dana Whitfield', email: 'dana@example.com', phone: '+1 (555) 010-0142' } },
  { company: 'Harborline Logistics', jobTitle: 'Graduate Engineer Trainee', location: 'Chennai, India', employmentType: 'full-time', source: 'campus', status: 'rejected', appliedDaysAgo: 41 },
  { company: 'Fernleaf Studio', jobTitle: 'UI/UX Design Intern', location: 'Remote', employmentType: 'internship', source: 'linkedin', status: 'applied', appliedDaysAgo: 9 },
  { company: 'Tidewater Fintech', jobTitle: 'Associate Product Manager', location: 'Mumbai, India', employmentType: 'full-time', source: 'recruiter', status: 'interview', appliedDaysAgo: 18, interviewInDays: 5, contact: { name: 'Meera Nair', email: 'meera.nair@example.com' }, notes: 'Recruiter mentioned a case-study round next.' },
  { company: 'Kestrel Mobility', jobTitle: 'Full Stack Developer', location: 'Gurugram, India', employmentType: 'full-time', source: 'job-board', status: 'rejected', appliedDaysAgo: 27 },
  { company: 'Meridian Cloud', jobTitle: 'Cloud Support Engineer', location: 'Bengaluru, India', employmentType: 'full-time', source: 'company-website', status: 'withdrawn', appliedDaysAgo: 52, notes: 'Withdrew after moving forward with Brightpath.' },
  { company: 'Pinecrest Software', jobTitle: 'React Developer', location: 'Noida, India (Hybrid)', employmentType: 'full-time', source: 'referral', status: 'assessment', appliedDaysAgo: 15, deadlineInDays: 6 },
  { company: 'Arclight Media', jobTitle: 'Software Engineering Intern', location: 'Remote', employmentType: 'internship', source: 'campus', status: 'applied', appliedDaysAgo: 1 },
  { company: 'Sablewood Games', jobTitle: 'Junior Gameplay Programmer', location: 'Hyderabad, India', employmentType: 'full-time', source: 'other', status: 'saved', appliedDaysAgo: null, addedDaysAgo: 2, deadlineInDays: 12, notes: 'Portfolio review first, then apply.' },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildSampleDocuments(userId, now = new Date()) {
  return SAMPLE_ROWS.map(({ appliedDaysAgo, addedDaysAgo, deadlineInDays, interviewInDays, ...row }, index) => {
    // Offset by index so records added on the same day keep a stable order.
    const addedAt = new Date(now.getTime() - (addedDaysAgo ?? appliedDaysAgo) * DAY_MS - index * 60_000);
    const interview = interviewInDays == null ? null : new Date(now.getTime() + interviewInDays * DAY_MS);
    interview?.setUTCHours(5, 0, 0, 0); // 05:00 UTC = 10:30 in India

    return {
      ...row,
      userId,
      appliedDate: appliedDaysAgo == null ? '' : utcDateString(-appliedDaysAgo, now),
      deadline: deadlineInDays == null ? '' : utcDateString(deadlineInDays, now),
      interviewDate: interview,
      jobUrl: `https://jobs.example.com/${slugify(row.company)}/${slugify(row.jobTitle)}`,
      createdAt: addedAt,
      updatedAt: addedAt,
    };
  });
}

/**
 * Inserts the sample applications for one user. Refuses if that user already has
 * applications unless `reset` is true, in which case only *that user's*
 * applications are replaced. Returns the number of applications inserted.
 */
export async function seedApplications({ userId, reset = false, now = new Date() }) {
  const owner = new mongoose.Types.ObjectId(userId);
  const existing = await Application.countDocuments({ userId: owner });

  if (existing > 0 && !reset) {
    throw new Error(
      `This account already has ${existing} application(s). Add --reset to replace them.`,
    );
  }
  if (reset) await Application.deleteMany({ userId: owner });

  // create() runs validation and the search-field hooks; timestamps are supplied explicitly.
  const created = await Application.create(buildSampleDocuments(owner, now), { timestamps: false });
  return created.length;
}

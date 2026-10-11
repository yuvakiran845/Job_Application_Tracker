import mongoose from 'mongoose';
import {
  EMPLOYMENT_TYPE_VALUES,
  FIELD_LIMITS,
  SOURCE_VALUES,
  STATUS_VALUES,
} from '../constants/applications.js';
import { isCalendarDate } from '../utils/dates.js';
import { normalizeText } from '../utils/text.js';

const { Schema } = mongoose;

// Schema-level rules repeat the request validators on purpose: they protect data
// integrity even if a future code path skips request validation.

const optionalText = (max) => ({ type: String, trim: true, default: '', maxlength: max });

const calendarDate = {
  type: String,
  default: '',
  // Stored as "YYYY-MM-DD" (no time zone) so dates never shift by a day.
  validate: { validator: (value) => value === '' || isCalendarDate(value), message: 'Enter a valid date.' },
};

const applicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    company: { type: String, required: true, trim: true, maxlength: FIELD_LIMITS.company },
    jobTitle: { type: String, required: true, trim: true, maxlength: FIELD_LIMITS.jobTitle },
    location: { type: String, required: true, trim: true, maxlength: FIELD_LIMITS.location },
    jobUrl: optionalText(FIELD_LIMITS.jobUrl),
    employmentType: { type: String, enum: ['', ...EMPLOYMENT_TYPE_VALUES], default: '' },
    salaryRange: optionalText(FIELD_LIMITS.salaryRange),
    source: { type: String, enum: ['', ...SOURCE_VALUES], default: '' },
    status: { type: String, enum: STATUS_VALUES, required: true, default: 'applied' },
    appliedDate: calendarDate,
    deadline: calendarDate,
    // A moment in time (stored in UTC), unlike the calendar dates above.
    interviewDate: { type: Date, default: null },
    contact: {
      name: optionalText(FIELD_LIMITS.contactName),
      email: optionalText(FIELD_LIMITS.contactEmail),
      phone: optionalText(FIELD_LIMITS.contactPhone),
    },
    notes: optionalText(FIELD_LIMITS.notes),
    // Normalized copies used for accent- and case-insensitive search. Never returned.
    searchText: { type: String, default: '', select: false },
    locationText: { type: String, default: '', select: false },
  },
  { timestamps: true, versionKey: false },
);

applicationSchema.pre('validate', function updateSearchFields() {
  this.searchText = normalizeText(`${this.company} ${this.jobTitle}`);
  this.locationText = normalizeText(this.location);
});

// Every query is scoped by owner, so each index starts with userId.
applicationSchema.index({ userId: 1, createdAt: -1 });
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, appliedDate: -1 });
applicationSchema.index({ userId: 1, deadline: 1 });
applicationSchema.index({ userId: 1, interviewDate: 1 });

export const Application = mongoose.model('Application', applicationSchema);

/** API representation: `id` instead of `_id`, no owner or internal search fields. */
export function serializeApplication(doc) {
  const source = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(source._id),
    company: source.company,
    jobTitle: source.jobTitle,
    location: source.location,
    jobUrl: source.jobUrl ?? '',
    employmentType: source.employmentType ?? '',
    salaryRange: source.salaryRange ?? '',
    source: source.source ?? '',
    status: source.status,
    appliedDate: source.appliedDate ?? '',
    deadline: source.deadline ?? '',
    interviewDate: source.interviewDate ? new Date(source.interviewDate).toISOString() : '',
    contact: {
      name: source.contact?.name ?? '',
      email: source.contact?.email ?? '',
      phone: source.contact?.phone ?? '',
    },
    notes: source.notes ?? '',
    createdAt: new Date(source.createdAt).toISOString(),
    updatedAt: new Date(source.updatedAt).toISOString(),
  };
}

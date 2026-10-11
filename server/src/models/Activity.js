import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ACTIVITY_TYPES = ['created', 'status_changed', 'updated'];

/**
 * One recorded change to an application. Recorded as changes happen — history is
 * never reconstructed or invented for changes made before this existed. Field
 * names are stored for edits, but not the old or new values (notes and contact
 * details stay out of the log).
 */
const activitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, immutable: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    fromStatus: { type: String, default: undefined },
    toStatus: { type: String, default: undefined },
    fields: { type: [String], default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

activitySchema.index({ userId: 1, applicationId: 1, createdAt: -1 });

export const Activity = mongoose.model('Activity', activitySchema);

export function serializeActivity(activity) {
  return {
    id: String(activity._id),
    type: activity.type,
    ...(activity.fromStatus ? { fromStatus: activity.fromStatus } : {}),
    ...(activity.toStatus ? { toStatus: activity.toStatus } : {}),
    ...(activity.fields?.length ? { fields: activity.fields } : {}),
    createdAt: new Date(activity.createdAt).toISOString(),
  };
}

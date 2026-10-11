import mongoose from 'mongoose';

const { Schema } = mongoose;

export const SAVED_VIEW_LIMITS = { name: 40, query: 1000, perUser: 20 };

/** A named set of list filters (stored as a normalized URL query string). */
const savedViewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    name: { type: String, required: true, trim: true, maxlength: SAVED_VIEW_LIMITS.name },
    // Lowercased name, so "Interviews" and "interviews" can't both exist.
    nameKey: { type: String, required: true },
    query: { type: String, default: '', maxlength: SAVED_VIEW_LIMITS.query },
  },
  { timestamps: true, versionKey: false },
);

savedViewSchema.pre('validate', function setNameKey() {
  this.nameKey = (this.name ?? '').trim().toLowerCase();
});

savedViewSchema.index({ userId: 1, nameKey: 1 }, { unique: true });

export const SavedView = mongoose.model('SavedView', savedViewSchema);

export function serializeSavedView(view) {
  return {
    id: String(view._id),
    name: view.name,
    query: view.query,
    createdAt: new Date(view.createdAt).toISOString(),
  };
}

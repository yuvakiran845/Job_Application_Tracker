import mongoose from 'mongoose';

const { Schema } = mongoose;

export const USER_LIMITS = { name: 80, email: 254 };

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: USER_LIMITS.name },
    // Stored lowercase so uniqueness and login are case-insensitive.
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: USER_LIMITS.email },
    // bcrypt hash; never selected unless explicitly requested, never returned by the API.
    passwordHash: { type: String, required: true, select: false },
    // Incremented to invalidate every existing session (e.g. after a password change).
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true, versionKey: false },
);

userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);

/** API representation of a user: no password hash or session internals. */
export function serializeUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

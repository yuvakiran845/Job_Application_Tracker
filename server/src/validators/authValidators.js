import { z } from 'zod';
import { USER_LIMITS } from '../models/User.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;
// bcrypt only uses the first 72 bytes; reject longer input rather than silently truncating.
const BCRYPT_MAX_BYTES = 72;

function text(label) {
  return z.string({
    error: (issue) => (issue.input === undefined ? `${label} is required.` : `${label} must be text.`),
  });
}

const name = text('Name')
  .trim()
  .min(1, 'Name is required.')
  .max(USER_LIMITS.name, `Name must be ${USER_LIMITS.name} characters or fewer.`);

const email = text('Email')
  .trim()
  .toLowerCase()
  .min(1, 'Email is required.')
  .max(USER_LIMITS.email, 'Enter a valid email address.')
  .regex(EMAIL_PATTERN, 'Enter a valid email address.');

/** New passwords: length rules only (no composition rules, per current NIST guidance). */
const newPassword = (label) =>
  text(label)
    .min(PASSWORD_MIN, `${label} must be at least ${PASSWORD_MIN} characters.`)
    .max(PASSWORD_MAX, `${label} must be ${PASSWORD_MAX} characters or fewer.`)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= BCRYPT_MAX_BYTES, `${label} is too long.`)
    .refine((value) => value.trim().length > 0, `${label} can’t be only spaces.`);

// Existing passwords are checked against the hash, so only presence matters here.
const existingPassword = (label) => text(label).min(1, `${label} is required.`).max(1024, `${label} is too long.`);

const bodyError = { error: 'Request body must be a JSON object.' };

export const registerSchema = z.object({ name, email, password: newPassword('Password') }, bodyError);

export const loginSchema = z.object({ email, password: existingPassword('Password') }, bodyError);

export const updateProfileSchema = z
  .object({ name, email, currentPassword: existingPassword('Current password') }, bodyError)
  .partial()
  .refine((body) => body.name !== undefined || body.email !== undefined, 'Provide a name or email to update.');

export const changePasswordSchema = z.object(
  { currentPassword: existingPassword('Current password'), newPassword: newPassword('New password') },
  bodyError,
);

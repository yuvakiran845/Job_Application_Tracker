import { User, serializeUser } from '../models/User.js';
import { AppError, ValidationError } from '../utils/errors.js';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../utils/password.js';

const EMAIL_TAKEN = 'An account with this email already exists.';

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function invalidCredentials() {
  // One message for unknown email and wrong password, so accounts can't be discovered.
  return new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
}

async function assertCurrentPassword(userId, currentPassword) {
  const user = await User.findById(userId).select('+passwordHash +tokenVersion');
  if (!user || !(await verifyPassword(currentPassword ?? '', user.passwordHash))) {
    throw new ValidationError({ currentPassword: 'Current password is incorrect.' }, 'Current password is incorrect.');
  }
  return user;
}

/** Creates an account. Returns the user document (for the session cookie) and its API form. */
export async function registerUser({ name, email, password }) {
  try {
    const user = await User.create({ name, email, passwordHash: await hashPassword(password) });
    return { user, data: serializeUser(user) };
  } catch (error) {
    // The unique index is the source of truth, so concurrent sign-ups can't create duplicates.
    if (isDuplicateKeyError(error)) throw new AppError(409, 'EMAIL_TAKEN', EMAIL_TAKEN, { fieldErrors: { email: EMAIL_TAKEN } });
    throw error;
  }
}

export async function authenticate({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  if (!user) {
    await verifyAgainstDummy(password);
    throw invalidCredentials();
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw invalidCredentials();
  return { user, data: serializeUser(user) };
}

/** Updates name and/or email. Changing the email requires the current password. */
export async function updateProfile(userId, { name, email, currentPassword }) {
  const user = await User.findById(userId).select('+tokenVersion');
  if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'You need to sign in to do that.');

  if (email !== undefined && email !== user.email) {
    if (!currentPassword) {
      throw new ValidationError({ currentPassword: 'Enter your current password to change your email.' });
    }
    await assertCurrentPassword(userId, currentPassword);
    user.email = email;
  }
  if (name !== undefined) user.name = name;

  try {
    await user.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError(409, 'EMAIL_TAKEN', EMAIL_TAKEN, { fieldErrors: { email: EMAIL_TAKEN } });
    throw error;
  }
  return serializeUser(user);
}

/**
 * Changes the password and increments tokenVersion, which signs out every other
 * session. Returns the user document so the caller can issue a fresh cookie.
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await assertCurrentPassword(userId, currentPassword);
  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1;
  await user.save();
  return user;
}

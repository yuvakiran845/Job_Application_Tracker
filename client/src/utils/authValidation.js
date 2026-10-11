// Client-side checks for the sign-in and sign-up forms. They mirror the API's
// rules (server/src/validators/authValidators.js) for instant feedback; the API
// remains the authority.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;
const BCRYPT_MAX_BYTES = 72;

function checkEmail(email) {
  const value = email.trim();
  if (!value) return 'Email is required.';
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return 'Enter a valid email address.';
  return undefined;
}

export function validateLogin({ email, password }) {
  const errors = {};
  const emailError = checkEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Password is required.';
  return errors;
}

export function validateRegistration({ name, email, password }) {
  const errors = {};
  const trimmedName = name.trim();
  if (!trimmedName) errors.name = 'Name is required.';
  else if (trimmedName.length > 80) errors.name = 'Name must be 80 characters or fewer.';

  const emailError = checkEmail(email);
  if (emailError) errors.email = emailError;

  if (password.length < PASSWORD_MIN) errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  else if (password.length > PASSWORD_MAX) errors.password = `Password must be ${PASSWORD_MAX} characters or fewer.`;
  else if (new TextEncoder().encode(password).length > BCRYPT_MAX_BYTES) errors.password = 'Password is too long.';
  else if (!password.trim()) errors.password = 'Password can’t be only spaces.';

  return errors;
}

/** Only same-app paths are allowed as post-login destinations (prevents open redirects). */
export function getSafeRedirect(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  if (value.startsWith('/login') || value.startsWith('/register')) return '/';
  return value;
}

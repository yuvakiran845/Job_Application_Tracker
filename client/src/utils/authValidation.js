// Client-side checks for the account forms. They mirror the API's rules
// (server/src/validators/authValidators.js) for instant feedback; the API
// remains the authority.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;
const BCRYPT_MAX_BYTES = 72;
const NAME_MAX = 80;

function checkName(name) {
  const value = name.trim();
  if (!value) return 'Name is required.';
  if (value.length > NAME_MAX) return `Name must be ${NAME_MAX} characters or fewer.`;
  return undefined;
}

function checkEmail(email) {
  const value = email.trim();
  if (!value) return 'Email is required.';
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return 'Enter a valid email address.';
  return undefined;
}

function checkNewPassword(password, label = 'Password') {
  if (password.length < PASSWORD_MIN) return `${label} must be at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `${label} must be ${PASSWORD_MAX} characters or fewer.`;
  if (new TextEncoder().encode(password).length > BCRYPT_MAX_BYTES) return `${label} is too long.`;
  if (!password.trim()) return `${label} can’t be only spaces.`;
  return undefined;
}

function collect(checks) {
  return Object.fromEntries(Object.entries(checks).filter(([, message]) => message));
}

export function validateLogin({ email, password }) {
  return collect({ email: checkEmail(email), password: password ? undefined : 'Password is required.' });
}

export function validateRegistration({ name, email, password }) {
  return collect({ name: checkName(name), email: checkEmail(email), password: checkNewPassword(password) });
}

/** `emailChanged` makes the current password required, as the API does. */
export function validateProfile({ name, email, currentPassword }, { emailChanged }) {
  return collect({
    name: checkName(name),
    email: checkEmail(email),
    currentPassword:
      emailChanged && !currentPassword ? 'Enter your current password to change your email.' : undefined,
  });
}

export function validatePasswordChange({ currentPassword, newPassword }) {
  return collect({
    currentPassword: currentPassword ? undefined : 'Current password is required.',
    newPassword:
      checkNewPassword(newPassword, 'New password') ??
      (newPassword === currentPassword ? 'Choose a password different from your current one.' : undefined),
  });
}

/** Only same-app paths are allowed as post-login destinations (prevents open redirects). */
export function getSafeRedirect(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  if (value.startsWith('/login') || value.startsWith('/register')) return '/';
  return value;
}

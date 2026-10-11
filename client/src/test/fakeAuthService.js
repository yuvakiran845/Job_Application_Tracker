import { vi } from 'vitest';
import { ApiError, ValidationError } from '../services/errors';

export const KNOWN_USER = { id: 'user-1', name: 'Priya Raman', email: 'priya@example.com' };
export const KNOWN_PASSWORD = 'correct horse battery';

/** In-memory stand-in for services/authService.js with the same behaviour and errors. */
export function createFakeAuthService({ signedIn = false } = {}) {
  let current = signedIn ? KNOWN_USER : null;
  const accounts = [{ ...KNOWN_USER, password: KNOWN_PASSWORD }];

  return {
    getCurrentUser: vi.fn(async () => current),
    login: vi.fn(async ({ email, password }) => {
      const account = accounts.find((item) => item.email === email.toLowerCase() && item.password === password);
      if (!account) throw new ApiError('Email or password is incorrect.', { status: 401, code: 'INVALID_CREDENTIALS' });
      current = { id: account.id, name: account.name, email: account.email };
      return current;
    }),
    register: vi.fn(async ({ name, email, password }) => {
      if (accounts.some((item) => item.email === email.toLowerCase())) {
        throw new ValidationError('An account with this email already exists.', {
          email: 'An account with this email already exists.',
        });
      }
      const account = { id: `user-${accounts.length + 1}`, name, email: email.toLowerCase(), password };
      accounts.push(account);
      current = { id: account.id, name, email: account.email };
      return current;
    }),
    logout: vi.fn(async () => {
      current = null;
    }),
  };
}

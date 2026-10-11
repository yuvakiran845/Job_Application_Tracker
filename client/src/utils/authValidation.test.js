import { describe, expect, it } from 'vitest';
import { getSafeRedirect, validateLogin, validateRegistration } from './authValidation';

describe('validateRegistration', () => {
  const valid = { name: 'Priya', email: 'priya@example.com', password: 'correct horse battery' };

  it('accepts valid details', () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it('checks every field', () => {
    expect(validateRegistration({ name: ' ', email: 'x', password: 'short' })).toEqual({
      name: 'Name is required.',
      email: 'Enter a valid email address.',
      password: 'Password must be at least 8 characters.',
    });
  });

  it('matches the API’s password rules', () => {
    expect(validateRegistration({ ...valid, password: 'é'.repeat(40) }).password).toBe('Password is too long.');
    expect(validateRegistration({ ...valid, password: ' '.repeat(10) }).password).toBe('Password can’t be only spaces.');
    expect(validateRegistration({ ...valid, password: 'x'.repeat(65) }).password).toMatch(/64 characters or fewer/);
  });
});

describe('validateLogin', () => {
  it('requires an email and password', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Email is required.',
      password: 'Password is required.',
    });
  });
});

describe('getSafeRedirect', () => {
  it.each([
    ['/applications?status=offer', '/applications?status=offer'],
    ['/applications/abc', '/applications/abc'],
    [null, '/'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['/login', '/'],
    ['/register?next=/x', '/'],
  ])('%s → %s', (input, expected) => {
    expect(getSafeRedirect(input)).toBe(expected);
  });
});

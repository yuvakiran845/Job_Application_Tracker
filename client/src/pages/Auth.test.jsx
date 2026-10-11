import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { SESSION_EXPIRED_EVENT } from '../services/apiClient';
import { ApiError } from '../services/errors';
import { resetSampleData } from '../services/applicationService';
import { KNOWN_PASSWORD, KNOWN_USER, createFakeAuthService } from '../test/fakeAuthService';
import { renderApp } from '../test/renderApp';

beforeEach(async () => {
  await resetSampleData();
});

describe('protected routes', () => {
  it('sends signed-out visitors to sign in, then back to the page they wanted', async () => {
    const auth = createFakeAuthService();
    const { user, router } = renderApp('/applications?status=offer', { auth });

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/applications?status=offer')}`);

    await user.type(screen.getByLabelText('Email'), KNOWN_USER.email);
    await user.type(screen.getByLabelText('Password'), KNOWN_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/applications'));
    expect(router.state.location.search).toBe('?status=offer');
    expect(await screen.findByRole('heading', { level: 1, name: 'Applications' })).toBeTruthy();
  });

  it('redirects signed-in users away from the sign-in page', async () => {
    const { router } = renderApp('/login', { auth: createFakeAuthService({ signedIn: true }) });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
  });

  it('ignores unsafe redirect targets after sign-in', async () => {
    const auth = createFakeAuthService();
    const { user, router } = renderApp(`/login?next=${encodeURIComponent('//evil.example/phish')}`, { auth });
    await user.type(await screen.findByLabelText('Email'), KNOWN_USER.email);
    await user.type(screen.getByLabelText('Password'), KNOWN_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('explains when the API cannot be reached and lets the user retry', async () => {
    const auth = createFakeAuthService({ signedIn: true });
    auth.getCurrentUser.mockRejectedValueOnce(new ApiError('Can’t reach the CareerFlow server.'));
    const { user } = renderApp('/', { auth });

    expect(await screen.findByText('CareerFlow can’t start right now')).toBeTruthy();
    expect(screen.getByText('Can’t reach the CareerFlow server.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
  });
});

describe('sign in', () => {
  it('validates the form before calling the API', async () => {
    const auth = createFakeAuthService();
    const { user } = renderApp('/login', { auth });
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Password is required.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Email'));
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('shows the API error for wrong credentials and keeps the user on the page', async () => {
    const { user, router } = renderApp('/login', { auth: createFakeAuthService() });
    await user.type(await screen.findByLabelText('Email'), KNOWN_USER.email);
    await user.type(screen.getByLabelText('Password'), 'wrong password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Email or password is incorrect.');
    expect(router.state.location.pathname).toBe('/login');
  });

  it('lets the user reveal the password they typed', async () => {
    const { user } = renderApp('/login', { auth: createFakeAuthService() });
    const password = await screen.findByLabelText('Password');
    expect(password.type).toBe('password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('create account', () => {
  it('validates input and shows a taken email next to the field', async () => {
    const auth = createFakeAuthService();
    const { user } = renderApp('/register', { auth });

    await user.type(await screen.findByLabelText('Name'), 'Arjun');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
    expect(auth.register).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), KNOWN_USER.email);
    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'a long enough password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('An account with this email already exists.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Email'));
  });

  it('signs the new user in and opens the dashboard', async () => {
    const { user, router } = renderApp('/register', { auth: createFakeAuthService() });
    await user.type(await screen.findByLabelText('Name'), 'Arjun Mehta');
    await user.type(screen.getByLabelText('Email'), 'arjun@example.com');
    await user.type(screen.getByLabelText('Password'), 'a long enough password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
  });
});

describe('signing out and expired sessions', () => {
  it('signs out from the profile menu', async () => {
    const auth = createFakeAuthService({ signedIn: true });
    const { user, router } = renderApp('/applications', { auth });

    await user.click(await screen.findByRole('button', { name: 'Profile menu' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText(KNOWN_USER.email)).toBeTruthy();
    await user.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByText('You’ve been signed out.')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/login');
    // No "next" after an explicit sign-out: the next user shouldn't land on this user's page.
    expect(router.state.location.search).toBe('');
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it('returns to sign-in when the API reports the session has ended', async () => {
    const { router } = renderApp('/applications', { auth: createFakeAuthService({ signedIn: true }) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Applications' })).toBeTruthy();

    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });

    expect(await screen.findByText('Your session has ended. Please sign in again.')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/applications')}`);
  });
});

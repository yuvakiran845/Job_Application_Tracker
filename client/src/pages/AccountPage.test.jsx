import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { resetSampleData } from '../services/applicationService';
import { KNOWN_PASSWORD, KNOWN_USER, createFakeAuthService } from '../test/fakeAuthService';
import { renderApp } from '../test/renderApp';

beforeEach(async () => {
  await resetSampleData();
});

async function openAccount() {
  const auth = createFakeAuthService({ signedIn: true });
  const result = renderApp('/account', { auth });
  await screen.findByRole('heading', { level: 1, name: 'Account' });
  return { ...result, auth };
}

function section(name) {
  return screen.getByRole('region', { name });
}

describe('account settings', () => {
  it('is reachable from the profile menu', async () => {
    const { user, router } = renderApp('/', { auth: createFakeAuthService({ signedIn: true }) });
    await user.click(await screen.findByRole('button', { name: 'Profile menu' }));
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Account settings' }));
    expect(router.state.location.pathname).toBe('/account');
  });

  it('updates the name and reflects it in the profile menu', async () => {
    const { user, auth } = await openAccount();
    const profile = section('Profile');
    const save = within(profile).getByRole('button', { name: 'Save profile' });
    expect(save.disabled).toBe(true); // nothing changed yet

    const name = within(profile).getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Priya R.');
    await user.click(save);

    expect(await screen.findByText('Profile updated')).toBeTruthy();
    expect(auth.updateProfile).toHaveBeenCalledWith({ name: 'Priya R.' });
    await user.click(screen.getByRole('button', { name: 'Profile menu' }));
    expect(within(screen.getByRole('menu')).getByText('Priya R.')).toBeTruthy();
  });

  it('requires the current password to change the email', async () => {
    const { user } = await openAccount();
    const profile = section('Profile');
    expect(within(profile).queryByLabelText('Current password')).toBeNull();

    const email = within(profile).getByLabelText('Email');
    await user.clear(email);
    await user.type(email, 'priya.new@example.com');
    const save = within(profile).getByRole('button', { name: 'Save profile' });

    await user.click(save);
    expect(within(profile).getByText('Enter your current password to change your email.')).toBeTruthy();

    await user.type(within(profile).getByLabelText('Current password'), 'wrong password');
    await user.click(save);
    expect(await within(profile).findByText('Current password is incorrect.')).toBeTruthy();

    const current = within(profile).getByLabelText('Current password');
    await user.clear(current);
    await user.type(current, KNOWN_PASSWORD);
    await user.click(save);
    expect(await screen.findByText('Your email is now priya.new@example.com.')).toBeTruthy();
  });

  it('validates and changes the password', async () => {
    const { user, auth } = await openAccount();
    const password = section('Password');
    const submit = within(password).getByRole('button', { name: 'Change password' });

    await user.click(submit);
    expect(within(password).getByText('Current password is required.')).toBeTruthy();
    expect(within(password).getByText('New password must be at least 8 characters.')).toBeTruthy();

    await user.type(within(password).getByLabelText('Current password'), KNOWN_PASSWORD);
    await user.type(within(password).getByLabelText('New password'), KNOWN_PASSWORD);
    await user.click(submit);
    expect(within(password).getByText('Choose a password different from your current one.')).toBeTruthy();
    expect(auth.changePassword).not.toHaveBeenCalled();

    const newPassword = within(password).getByLabelText('New password');
    await user.clear(newPassword);
    await user.type(newPassword, 'a brand new passphrase');
    await user.click(submit);

    expect(await screen.findByText('Password changed')).toBeTruthy();
    expect(screen.getByText('You’ve been signed out on your other devices.')).toBeTruthy();
    expect(within(password).getByLabelText('Current password').value).toBe('');
    expect(auth.changePassword).toHaveBeenCalledWith({
      currentPassword: KNOWN_PASSWORD,
      newPassword: 'a brand new passphrase',
    });
  });

  it('shows the signed-in email', async () => {
    await openAccount();
    expect(screen.getByText(KNOWN_USER.email, { selector: 'span' })).toBeTruthy();
  });
});

import { expect, test } from '@playwright/test';
import { PASSWORD, signUpViaApi, uniqueEmail } from './helpers.js';

const CSRF = { 'X-CSRF-Protection': '1' };

test.describe('Authentication', () => {
  test('protected pages redirect to sign in and come back afterwards', async ({ page }) => {
    const { email } = await signUpViaApi(page);
    await page.context().clearCookies();

    await page.goto('/pipeline');
    await expect(page).toHaveURL(/\/login\?next=%2Fpipeline$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/pipeline$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Pipeline' })).toBeVisible();
  });

  test('a new account starts empty, and the session survives a reload', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Name').fill('Asha Verma');
    await page.getByLabel('Email').fill(uniqueEmail('register'));
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('No applications yet')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await page.getByRole('button', { name: 'Profile menu' }).click();
    await expect(page.getByRole('menu')).toContainText('Asha Verma');
  });

  test('registration rejects invalid input and duplicate emails', async ({ page }) => {
    const { email } = await signUpViaApi(page);
    await page.context().clearCookies();

    await page.goto('/register');
    await page.getByLabel('Name').fill('Asha');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible();

    await page.getByLabel('Email').fill(email.toUpperCase());
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('An account with this email already exists.')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('wrong password and unknown email give the same message', async ({ page }) => {
    const { email } = await signUpViaApi(page);
    await page.context().clearCookies();

    for (const [address, password] of [
      [email, 'not the right password'],
      [uniqueEmail('nobody'), PASSWORD],
    ]) {
      await page.goto('/login');
      await page.getByLabel('Email').fill(address);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('signing out ends the session for the browser and the API', async ({ page }) => {
    await signUpViaApi(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Profile menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page.getByText('You’ve been signed out.')).toBeVisible();
    // The redirect after signing out never carries the previous page.
    await expect(page).toHaveURL(/\/login$/);

    const response = await page.request.get('/api/applications');
    expect(response.status()).toBe(401);

    await page.goto('/applications');
    await expect(page).toHaveURL(/\/login\?next=%2Fapplications$/);
  });

  test('the API rejects unauthenticated and cross-site requests', async ({ request }) => {
    for (const path of ['/api/auth/me', '/api/applications', '/api/applications/stats', '/api/applications/export', '/api/views']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(401);
      expect((await response.json()).error.code, path).toBe('AUTH_REQUIRED');
    }

    // State-changing requests without the CSRF header are refused before anything else.
    const noHeader = await request.post('/api/auth/login', { data: { email: 'a@example.com', password: PASSWORD } });
    expect(noHeader.status()).toBe(403);

    const crossSite = await request.post('/api/auth/login', {
      data: { email: 'a@example.com', password: PASSWORD },
      headers: { ...CSRF, Origin: 'https://evil.example' },
    });
    expect(crossSite.status()).toBe(403);
  });
});

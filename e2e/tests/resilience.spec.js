import { expect, test } from '@playwright/test';
import { PASSWORD, createApplicationViaApi, signUpViaApi } from './helpers.js';

// The server's own 503 mapping is tested against a real disconnected database in
// server/test/database-down.test.js. Here the browser's network layer stands in for
// a failing API, to check what users see and that they can recover.
const DB_DOWN = 'CareerFlow can’t reach its database right now. Please try again in a moment.';
const LIST_URL = /\/api\/applications(\?|$)/;

function databaseDown(route) {
  return route.fulfill({
    status: 503,
    contentType: 'application/json',
    headers: { 'Retry-After': '10' },
    body: JSON.stringify({ error: { code: 'DATABASE_UNAVAILABLE', message: DB_DOWN } }),
  });
}

test.describe('When the API fails', () => {
  test('a failed list load explains why and recovers with "Try again"', async ({ page }) => {
    await signUpViaApi(page);
    await createApplicationViaApi(page, { company: 'Northwind Labs' });

    let failing = true;
    await page.route(LIST_URL, (route) => (failing ? databaseDown(route) : route.continue()));
    await page.goto('/applications');

    // Transient errors are retried twice before the error is shown.
    const alert = page.getByRole('alert').filter({ hasText: 'We couldn’t load your applications' });
    await expect(alert).toContainText(DB_DOWN, { timeout: 15_000 });

    failing = false;
    await alert.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('link', { name: 'Northwind Labs', exact: true })).toBeVisible();
    await expect(alert).toBeHidden();
  });

  test('a failed status change is rolled back and nothing is lost', async ({ page }) => {
    await signUpViaApi(page);
    const application = await createApplicationViaApi(page, { company: 'Northwind Labs', status: 'applied' });
    await page.goto('/applications');

    const select = page.getByRole('combobox', { name: /^Status for/ });
    await expect(select).toHaveValue('applied');
    await page.route(`**/api/applications/${application.id}`, (route) =>
      route.request().method() === 'PUT' ? databaseDown(route) : route.continue(),
    );
    await select.selectOption('offer');

    await expect(page.getByText('Couldn’t update status')).toBeVisible();
    await expect(select).toHaveValue('applied');

    await page.unrouteAll({ behavior: 'wait' });
    const saved = await page.request.get(`/api/applications/${application.id}`);
    expect((await saved.json()).data.status).toBe('applied');
  });

  test('if the server is unreachable at startup, the app says so and can retry', async ({ page }) => {
    await signUpViaApi(page);

    let offline = true;
    await page.route('**/api/**', (route) => (offline ? route.abort('connectionrefused') : route.continue()));
    await page.goto('/');

    await expect(page.getByText('CareerFlow can’t start right now')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Can’t reach the CareerFlow server.', { exact: false })).toBeVisible();

    offline = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  });

  test('an expired session sends the user to sign in, then back', async ({ page }) => {
    const { email } = await signUpViaApi(page);
    await page.goto('/applications');
    await expect(page.getByRole('heading', { level: 1, name: 'Applications' })).toBeVisible();

    // The session ends elsewhere (cookie gone); the next request is refused.
    await page.context().clearCookies();
    await page.getByRole('banner').getByRole('button', { name: 'Add application' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add application' });
    await dialog.getByLabel('Company').fill('Northwind Labs');
    await dialog.getByLabel('Job title').fill('Frontend Engineer');
    await dialog.getByLabel('Location').fill('Remote');
    await dialog.getByRole('button', { name: 'Add application' }).click();

    await expect(page.getByText('Your session has ended. Please sign in again.')).toBeVisible();
    await expect(page).toHaveURL(/\/login\?next=%2Fapplications$/);

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/applications$/);
    await expect(page.getByText('No applications yet')).toBeVisible();
  });
});

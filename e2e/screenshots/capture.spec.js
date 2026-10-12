import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { devices, expect, test } from '@playwright/test';
// The same fictional sample applications as `npm run seed` (example.com links, 555 numbers).
import { buildSampleDocuments } from '../../server/scripts/seedData.js';
import { signUpViaApi, uniqueEmail } from '../tests/helpers.js';

// Captures the README screenshots from the real app (API + MongoDB + production
// build) with the sample data. Run with `npm run screenshots` in e2e/.
const OUT_DIR = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url));
const CSRF = { 'X-CSRF-Protection': '1' };
const FIELDS = ['company', 'jobTitle', 'location', 'employmentType', 'source', 'status', 'salaryRange', 'appliedDate', 'deadline', 'jobUrl', 'contact', 'notes'];

async function seedSampleData(page) {
  // Oldest first, so "Recently added" lists the newest.
  const documents = buildSampleDocuments('000000000000000000000000').sort((a, b) => a.createdAt - b.createdAt);
  const created = {};
  for (const document of documents) {
    const body = Object.fromEntries(FIELDS.filter((key) => document[key] !== undefined).map((key) => [key, document[key]]));
    if (document.interviewDate) body.interviewDate = document.interviewDate.toISOString();
    // Northwind starts as "applied" and moves to "interview" below, so its timeline has a real change.
    if (document.company === 'Northwind Labs') body.status = 'applied';
    const response = await page.request.post('/api/applications', { data: body, headers: CSRF });
    expect(response.status(), await response.text()).toBe(201);
    created[document.company] = (await response.json()).data;
  }
  const northwind = created['Northwind Labs'];
  await page.request.put(`/api/applications/${northwind.id}`, { data: { status: 'interview' }, headers: CSRF });
  await page.request.post('/api/views', { data: { name: 'Interviews', query: 'status=interview' }, headers: CSRF });
  return created;
}

async function capture(page, name) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), animations: 'disabled', caret: 'hide' });
}

test('README screenshots', async ({ page, browser }) => {
  test.setTimeout(120_000);
  mkdirSync(OUT_DIR, { recursive: true });

  const email = uniqueEmail('demo');
  await signUpViaApi(page, { name: 'Asha Verma', email });
  const created = await seedSampleData(page);

  // A taller window for the dashboard so the whole page fits (a full-page capture
  // would cut the fixed sidebar off at the original window height).
  await page.setViewportSize({ width: 1440, height: 1500 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Frontend Engineer at Northwind Labs' }).first()).toBeVisible();
  await capture(page, 'dashboard');
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('/applications');
  await expect(page.getByText('12 applications in total.')).toBeVisible();
  await capture(page, 'applications');

  await page.goto('/pipeline');
  await expect(page.getByRole('region', { name: 'Interview', exact: true }).getByRole('link', { name: 'Northwind Labs' })).toBeVisible();
  await capture(page, 'pipeline');

  await page.goto('/calendar');
  await expect(page.getByRole('region', { name: 'Upcoming' }).getByRole('listitem').first()).toBeVisible();
  await capture(page, 'calendar');

  await page.goto('/analytics');
  await expect(page.getByRole('group', { name: 'Submitted', exact: true })).toContainText('11');
  await page.locator('.recharts-bar-rectangle').first().waitFor();
  await capture(page, 'analytics');

  await page.goto(`/applications/${created['Northwind Labs'].id}`);
  await expect(page.getByText('Status changed from Applied to Interview')).toBeVisible();
  await capture(page, 'details');

  await page.goto('/applications');
  await page.getByRole('banner').getByRole('button', { name: 'Add Job' }).click();
  await expect(page.getByRole('dialog', { name: 'Add application' })).toBeVisible();
  await capture(page, 'add-application');

  // Phone size, same account.
  const phone = await browser.newContext({ ...devices['Pixel 7'], storageState: await page.context().storageState() });
  const mobile = await phone.newPage();
  await mobile.goto('/');
  await expect(mobile.getByRole('region', { name: 'Upcoming Interviews' }).getByRole('listitem').first()).toBeVisible();
  await capture(mobile, 'mobile-dashboard');
  await mobile.goto('/applications');
  await expect(mobile.getByRole('list', { name: 'All applications' }).getByRole('link', { name: 'Northwind Labs' })).toBeVisible();
  await capture(mobile, 'mobile-applications');
  await mobile.goto('/');
  await mobile.getByRole('button', { name: 'Open navigation' }).click();
  await expect(mobile.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
  await capture(mobile, 'mobile-navigation');
  await phone.close();
});

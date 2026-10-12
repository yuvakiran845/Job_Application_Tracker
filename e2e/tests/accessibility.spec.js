import { expect, test } from '@playwright/test';
import {
  createApplicationViaApi,
  expectNoAccessibilityViolations,
  hasHorizontalOverflow,
  localDate,
  signUpViaApi,
} from './helpers.js';

const PAGES = [
  { path: '/', heading: 'Dashboard' },
  { path: '/applications', heading: 'Applications' },
  { path: '/pipeline', heading: 'Pipeline' },
  { path: '/calendar', heading: 'Calendar' },
  { path: '/analytics', heading: 'Analytics' },
  { path: '/account', heading: 'Account' },
];

async function seed(page) {
  const first = await createApplicationViaApi(page, {
    company: 'Northwind Labs',
    jobTitle: 'Frontend Engineer',
    status: 'interview',
    source: 'linkedin',
    deadline: localDate(4),
    contact: { name: 'Priya Raman', email: 'priya@example.com' },
    notes: 'Second round with the platform team.',
  });
  await createApplicationViaApi(page, { company: 'Brightpath', status: 'offer', source: 'referral', appliedDate: localDate(-12) });
  await createApplicationViaApi(page, { company: 'Quillstone Systems', status: 'rejected', appliedDate: localDate(-30) });
  await createApplicationViaApi(page, { company: 'Sablewood Games', status: 'saved', appliedDate: '', deadline: localDate(9) });
  return first;
}

test.describe('Accessibility (axe-core, WCAG 2.1 A/AA)', () => {
  test('sign-in and registration pages', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expectNoAccessibilityViolations(page, '/login');

    // With validation errors showing.
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await expectNoAccessibilityViolations(page, '/login with errors');

    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expectNoAccessibilityViolations(page, '/register');
  });

  test('every signed-in page, with data', async ({ page }) => {
    // Visits many pages in one test; allow for slow machines.
    test.slow();
    await signUpViaApi(page);
    const application = await seed(page);

    for (const { path, heading } of [...PAGES, { path: `/applications/${application.id}`, heading: 'Application details' }]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      // Let data load (no skeletons or busy regions left) before scanning.
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await expectNoAccessibilityViolations(page, path);

      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
      expect(await page.title(), path).toMatch(/CareerFlow/);
      expect(await hasHorizontalOverflow(page), `${path} scrolls sideways`).toBe(false);
    }
  });

  test('empty states', async ({ page }) => {
    // Visits many pages in one test; allow for slow machines.
    test.slow();
    await signUpViaApi(page);
    for (const { path, heading } of PAGES.slice(0, 5)) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await expectNoAccessibilityViolations(page, `${path} (empty)`);
    }
  });

  test('dialogs, menus, and the analytics data table', async ({ page }) => {
    await signUpViaApi(page);
    await seed(page);

    await page.goto('/applications');
    await page.getByRole('banner').getByRole('button', { name: 'Add application' }).click();
    const add = page.getByRole('dialog', { name: 'Add application' });
    await add.getByRole('button', { name: 'Add application' }).click();
    await expect(add.getByText('Company is required.')).toBeVisible();
    await expectNoAccessibilityViolations(page, 'add dialog with errors');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'More actions for Frontend Engineer at Northwind Labs' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expectNoAccessibilityViolations(page, 'row actions menu');
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog', { name: 'Delete application?' })).toBeVisible();
    await expectNoAccessibilityViolations(page, 'delete confirmation');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Profile menu' }).click();
    await expectNoAccessibilityViolations(page, 'profile menu');
    await page.keyboard.press('Escape');

    await page.goto('/analytics?range=all');
    await page.getByRole('button', { name: 'Show table' }).click();
    await expect(page.getByRole('table', { name: /Applications submitted per/ })).toBeVisible();
    await expectNoAccessibilityViolations(page, 'analytics table view');
  });

  test('interactive controls all have accessible names', async ({ page }) => {
    // Visits many pages in one test; allow for slow machines.
    test.slow();
    await signUpViaApi(page);
    await seed(page);

    for (const path of ['/', '/applications', '/pipeline', '/calendar', '/analytics', '/account']) {
      await page.goto(path);
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      const unnamed = await page.evaluate(() => {
        const controls = document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [role="menuitem"]');
        return [...controls]
          .filter((el) => el.offsetParent !== null || el.getClientRects().length > 0)
          .filter((el) => {
            const labelled =
              el.getAttribute('aria-label') ||
              (el.getAttribute('aria-labelledby') &&
                el
                  .getAttribute('aria-labelledby')
                  .split(' ')
                  .some((id) => document.getElementById(id)?.textContent.trim())) ||
              (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent.trim()) ||
              el.closest('label')?.textContent.trim() ||
              (el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && el.tagName !== 'TEXTAREA' && el.textContent.trim()) ||
              el.getAttribute('title');
            return !labelled;
          })
          .map((el) => el.outerHTML.slice(0, 120));
      });
      expect(unnamed, `unnamed controls on ${path}`).toEqual([]);
    }
  });
});

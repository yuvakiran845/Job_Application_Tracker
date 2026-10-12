import { expect, test } from '@playwright/test';
import {
  createApplicationViaApi,
  expectNoAccessibilityViolations,
  hasHorizontalOverflow,
  localDate,
  signUpViaApi,
} from './helpers.js';

// Runs in the "mobile" project (Pixel 7 viewport, touch, mobile user agent).

test.describe('Mobile layout', () => {
  test('no page scrolls sideways', async ({ page }) => {
    // Visits many pages in one test; allow for slow machines.
    test.slow();
    for (const path of ['/login', '/register']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await hasHorizontalOverflow(page), `${path} scrolls sideways`).toBe(false);
    }

    await signUpViaApi(page);
    const application = await createApplicationViaApi(page, {
      company: 'An Exceptionally Long Company Name Private Limited',
      jobTitle: 'Senior Staff Frontend Platform Engineer, Developer Experience',
      status: 'interview',
      deadline: localDate(3),
    });
    await createApplicationViaApi(page, { company: 'Brightpath', status: 'offer' });

    for (const path of ['/', '/applications', `/applications/${application.id}`, '/pipeline', '/calendar', '/analytics', '/account']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      expect(await hasHorizontalOverflow(page), `${path} scrolls sideways`).toBe(false);
    }
  });

  test('navigation drawer opens, navigates, and closes', async ({ page }) => {
    await signUpViaApi(page);
    await page.goto('/');

    // The desktop sidebar is hidden; the menu button opens a drawer instead.
    const open = page.getByRole('button', { name: 'Open navigation' });
    await expect(open).toBeVisible();
    await open.click();
    const drawer = page.getByRole('dialog', { name: 'Navigation' });
    await expect(drawer).toBeVisible();
    await expect(open).toHaveAttribute('aria-expanded', 'true');
    await expectNoAccessibilityViolations(page, 'mobile navigation drawer');

    await drawer.getByRole('link', { name: 'Pipeline' }).click();
    await expect(page).toHaveURL(/\/pipeline$/);
    await expect(drawer).toBeHidden();

    await open.click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(open).toBeFocused();
  });

  test('applications render as a list with working actions', async ({ page }) => {
    await signUpViaApi(page);
    await createApplicationViaApi(page, { company: 'Northwind Labs', status: 'applied' });
    await page.goto('/applications');

    // Table on wide screens, list on phones — same label for both.
    await expect(page.getByRole('table', { name: 'All applications' })).toBeHidden();
    const list = page.getByRole('list', { name: 'All applications' });
    await expect(list.getByRole('link', { name: 'Northwind Labs' })).toBeVisible();
    await expectNoAccessibilityViolations(page, 'mobile applications list');

    await list.getByRole('combobox', { name: /^Status for/ }).selectOption('interview');
    await expect(page.getByText('Status updated')).toBeVisible();

    // The add form fits the screen.
    await page.getByRole('banner').getByRole('button', { name: 'Add Job' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add application' });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('touch targets in the top bar are at least 36px', async ({ page }) => {
    await signUpViaApi(page);
    await page.goto('/');
    for (const name of ['Open navigation', 'Add Job', 'Profile menu']) {
      const box = await page.getByRole('banner').getByRole('button', { name }).boundingBox();
      expect(box.width, name).toBeGreaterThanOrEqual(36);
      expect(box.height, name).toBeGreaterThanOrEqual(36);
    }
  });
});

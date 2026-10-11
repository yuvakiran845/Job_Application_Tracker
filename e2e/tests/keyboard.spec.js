import { expect, test } from '@playwright/test';
import { createApplicationViaApi, localDate, signUpViaApi } from './helpers.js';

test.describe('Keyboard-only use', () => {
  test.beforeEach(async ({ page }) => {
    await signUpViaApi(page);
  });

  test('skip link jumps past the navigation to the page content', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
  });

  test('navigate between pages with Tab and Enter', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('link', { name: 'Applications' }).focus();
    for (const [name, path] of [
      ['Pipeline', '/pipeline'],
      ['Calendar', '/calendar'],
      ['Analytics', '/analytics'],
    ]) {
      // Tab forward until the link has focus — proves it's reachable in order.
      for (let i = 0; i < 5 && !(await nav.getByRole('link', { name }).evaluate((el) => el === document.activeElement)); i++) {
        await page.keyboard.press('Tab');
      }
      await expect(nav.getByRole('link', { name })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(nav.getByRole('link', { name })).toHaveAttribute('aria-current', 'page');
    }
  });

  test('add an application without a mouse; Escape closes dialogs and restores focus', async ({ page }) => {
    await page.goto('/applications');
    const addButton = page.getByRole('banner').getByRole('button', { name: 'Add application' });

    // Escape closes the dialog and returns focus to the button that opened it.
    await addButton.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Add application' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Company')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(addButton).toBeFocused();

    // Fill the required fields in tab order, then submit with Enter.
    await page.keyboard.press('Enter');
    await expect(dialog.getByLabel('Company')).toBeFocused();
    await page.keyboard.type('Northwind Labs');
    await page.keyboard.press('Tab');
    await expect(dialog.getByLabel('Job title')).toBeFocused();
    await page.keyboard.type('Frontend Engineer');
    await page.keyboard.press('Tab');
    await expect(dialog.getByLabel('Location')).toBeFocused();
    await page.keyboard.type('Remote');
    await page.keyboard.press('Enter');

    await expect(page.getByText('Application added')).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('1 application in total.')).toBeVisible();
  });

  test('profile menu works with arrow keys and Escape', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Profile menu' });
    await trigger.focus();
    await page.keyboard.press('ArrowDown');

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.getByRole('menuitem').first()).toBeFocused();
    await page.keyboard.press('End');
    await expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(menu.getByRole('menuitem', { name: 'Account settings' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    // Enter on a menu item activates it.
    await page.keyboard.press('Enter');
    await expect(menu.getByRole('menuitem', { name: 'Account settings' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/account$/);
  });

  test('delete confirmation focuses the safe choice; row actions are reachable', async ({ page }) => {
    await createApplicationViaApi(page, { company: 'Northwind Labs' });
    await page.goto('/applications');

    const actions = page.getByRole('button', { name: /^More actions for/ });
    await actions.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('menuitem', { name: 'Delete' }).focus();
    await page.keyboard.press('Enter');

    const confirm = page.getByRole('dialog', { name: 'Delete application?' });
    await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(confirm).toBeHidden();
    // Nothing was deleted.
    await expect(page.getByText('1 application in total.')).toBeVisible();
  });

  test('calendar days are navigable with the arrow keys', async ({ page }) => {
    await createApplicationViaApi(page, { company: 'Northwind Labs', status: 'assessment', deadline: localDate(1) });
    await page.goto('/calendar');

    // Only the selected day (today) is in the tab order.
    const today = page.getByRole('button', { pressed: true });
    await today.focus();
    const todayLabel = await today.getAttribute('aria-label');
    await page.keyboard.press('ArrowRight');
    const tomorrow = page.getByRole('button', { pressed: true });
    await expect(tomorrow).toBeFocused();
    await expect(tomorrow).not.toHaveAttribute('aria-label', todayLabel);
    await expect(tomorrow).toHaveAttribute('aria-label', /1 deadline/);
    await expect(page.getByText('Assessment due').first()).toBeVisible();
  });
});

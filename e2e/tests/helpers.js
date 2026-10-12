import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

export const PASSWORD = 'correct horse battery staple';
const CSRF = { 'X-CSRF-Protection': '1' };

export function uniqueEmail(prefix = 'user') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Local calendar date `days` from today, as "YYYY-MM-DD". */
export function localDate(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Creates an account through the API. The session cookie lands in the page's
 * browser context, so the page is signed in afterwards.
 */
export async function signUpViaApi(page, { name = 'E2E Tester', email = uniqueEmail() } = {}) {
  const response = await page.request.post('/api/auth/register', {
    data: { name, email, password: PASSWORD },
    headers: CSRF,
  });
  expect(response.status(), await response.text()).toBe(201);
  return { name, email, ...(await response.json()).data };
}

export async function createApplicationViaApi(page, overrides = {}) {
  const response = await page.request.post('/api/applications', {
    data: {
      company: 'Northwind Labs',
      jobTitle: 'Frontend Engineer',
      location: 'Remote',
      status: 'applied',
      appliedDate: localDate(-3),
      ...overrides,
    },
    headers: CSRF,
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).data;
}

/** Fails on any WCAG 2.1 A/AA violation reported by axe-core, with a readable summary. */
export async function expectNoAccessibilityViolations(page, label) {
  // Scan the settled page: mid-way through a dialog's fade-in, colours are still
  // blended with the backdrop and contrast is measured too low. Endless animations
  // (loading pulses) are ignored.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState !== 'running' || animation.effect?.getComputedTiming().iterations === Infinity),
  );
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const summary = results.violations.map(
    (violation) =>
      `[${violation.impact}] ${violation.id}: ${violation.help}\n` +
      violation.nodes
        .slice(0, 3)
        .map((node) => `    ${node.target.join(' ')} — ${node.failureSummary?.split('\n')[1]?.trim() ?? ''}`)
        .join('\n'),
  );
  expect(summary, `Accessibility violations on ${label}`).toEqual([]);
}

/** True when the page can scroll sideways (it never should). */
export async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

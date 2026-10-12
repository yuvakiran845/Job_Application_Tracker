import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createApplicationViaApi, localDate, signUpViaApi } from './helpers.js';

/** A local date and time `days` from now, as an ISO instant (what the API stores). */
function localInstant(days, hours, minutes) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

test.describe('Dashboard, pipeline, calendar, analytics, export, saved views', () => {
  test('dashboard numbers match the account’s applications', async ({ page }) => {
    await signUpViaApi(page);
    for (const status of ['applied', 'interview', 'interview', 'offer', 'rejected']) {
      await createApplicationViaApi(page, { status });
    }
    await createApplicationViaApi(page, { status: 'saved', appliedDate: '' });

    await page.goto('/');
    const stat = (name) => page.getByRole('group', { name, exact: true });
    await expect(stat('Applications')).toContainText('6');
    await expect(stat('Applications')).toContainText('+5 applied this week');
    await expect(stat('Interviews')).toContainText('2');
    await expect(stat('Interviews')).toContainText('None scheduled');
    await expect(stat('Offers')).toContainText('1');
    // 4 of the 5 submitted applications (all but "applied") got a response; "saved" isn't submitted.
    await expect(stat('Response rate')).toContainText('80%');
    await expect(stat('Response rate')).toContainText('4 of 5 applications');
  });

  test('pipeline columns count by status, and moving a card updates both columns', async ({ page }) => {
    await signUpViaApi(page);
    await createApplicationViaApi(page, { company: 'Northwind Labs', status: 'applied' });
    await createApplicationViaApi(page, { company: 'Brightpath', status: 'applied' });
    await createApplicationViaApi(page, { company: 'Lumenfield', status: 'interview' });

    await page.goto('/pipeline');
    const column = (name) => page.getByRole('region', { name, exact: true });
    await expect(column('Applied')).toContainText('2 applications');
    await expect(column('Interview')).toContainText(/(?<!\d)1 application(?!s)/);

    const card = column('Applied').getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Northwind Labs' }) });
    await card.getByRole('combobox', { name: /^Status for/ }).selectOption('offer');

    await expect(column('Offer').getByRole('link', { name: 'Northwind Labs' })).toBeVisible();
    await expect(column('Applied').getByRole('link', { name: 'Northwind Labs' })).toHaveCount(0);
    await expect(column('Applied')).toContainText(/(?<!\d)1 application(?!s)/);

    await page.reload();
    await expect(column('Offer').getByRole('link', { name: 'Northwind Labs' })).toBeVisible();
  });

  test('calendar shows upcoming interviews and deadlines in local time', async ({ page }) => {
    await signUpViaApi(page);
    await createApplicationViaApi(page, {
      company: 'Northwind Labs',
      jobTitle: 'Frontend Engineer',
      status: 'interview',
      interviewDate: localInstant(2, 10, 30),
    });
    await createApplicationViaApi(page, {
      company: 'Quillstone Systems',
      jobTitle: 'Backend Engineer',
      status: 'assessment',
      deadline: localDate(5),
    });
    // Closed applications have nothing coming up.
    await createApplicationViaApi(page, { company: 'Old Co', status: 'rejected', deadline: localDate(3) });

    await page.goto('/calendar');
    const agenda = page.getByRole('region', { name: 'Upcoming' });
    const interview = agenda.getByRole('listitem').filter({ hasText: 'Frontend Engineer at Northwind Labs' });
    await expect(interview).toContainText('10:30');
    await expect(interview).toContainText('Interview');
    await expect(agenda.getByRole('listitem').filter({ hasText: 'Backend Engineer at Quillstone Systems' })).toContainText(
      'Assessment due',
    );
    await expect(agenda.getByText('Old Co')).toHaveCount(0);

    // The dashboard shows the same upcoming interview.
    await page.goto('/');
    const interviews = page.getByRole('region', { name: 'Upcoming Interviews' });
    await expect(interviews.getByRole('link', { name: 'Frontend Engineer at Northwind Labs' })).toBeVisible();
  });

  test('analytics rates match a hand-checked dataset', async ({ page }) => {
    await signUpViaApi(page);
    for (const [status, daysAgo] of [
      ['applied', 3],
      ['interview', 5],
      ['offer', 8],
      ['rejected', 10],
      ['interview', 60], // outside the last 30 days
    ]) {
      await createApplicationViaApi(page, { status, appliedDate: localDate(-daysAgo) });
    }
    await createApplicationViaApi(page, { status: 'saved', appliedDate: '' }); // never counted as submitted

    await page.goto('/analytics');
    const card = (name) => page.getByRole('group', { name, exact: true });

    await page.getByRole('button', { name: 'Last 30 days' }).click();
    await expect(card('Submitted')).toContainText('4');
    await expect(card('Response rate')).toContainText('75%');
    await expect(card('Response rate')).toContainText('3 of 4 applications got a response');
    await expect(card('Interview rate')).toContainText('50%');
    await expect(card('Offer rate')).toContainText('25%');

    await page.getByRole('button', { name: 'All time' }).click();
    await expect(card('Submitted')).toContainText('5');
    await expect(card('Response rate')).toContainText('80%');
    await expect(card('Interview rate')).toContainText('60%');
    await expect(card('Offer rate')).toContainText('20%');
  });

  test('CSV export downloads only the filtered rows, safely quoted', async ({ page }) => {
    await signUpViaApi(page);
    await createApplicationViaApi(page, { company: 'Northwind Labs', status: 'interview' });
    await createApplicationViaApi(page, { company: '=HYPERLINK("http://example.com")', status: 'interview' });
    await createApplicationViaApi(page, { company: 'Brightpath', status: 'applied' });

    await page.goto('/applications?status=interview');
    await expect(page.getByText('2 of 3 applications match your filters.')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^my-job-trackr-applications-\d{4}-\d{2}-\d{2}\.csv$/);
    await expect(page.getByText('Your filtered applications were downloaded as CSV.')).toBeVisible();

    const bytes = await readFile(await download.path());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM for Excel
    const lines = bytes.toString('utf8').slice(1).trim().split('\r\n');
    expect(lines[0].startsWith('Company,Job title,Location,Status')).toBe(true);
    expect(lines).toHaveLength(3);
    expect(lines.some((line) => line.startsWith('Northwind Labs,'))).toBe(true);
    // Spreadsheet formulas are neutralised with a leading apostrophe, and quotes doubled.
    expect(lines.some((line) => line.startsWith('"\'=HYPERLINK(""http://example.com"")",'))).toBe(true);
    expect(lines.some((line) => line.startsWith('Brightpath,'))).toBe(false);
  });

  test('saved views store filters on the server and restore them', async ({ page }) => {
    await signUpViaApi(page);
    await createApplicationViaApi(page, { company: 'Northwind Labs', status: 'interview' });
    await createApplicationViaApi(page, { company: 'Brightpath', status: 'applied' });

    await page.goto('/applications');
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('interview');
    await expect(page.getByText('1 of 2 applications match your filters.')).toBeVisible();

    await page.getByRole('button', { name: 'Save view' }).click();
    const dialog = page.getByRole('dialog', { name: 'Save this view' });
    await dialog.getByLabel('View name').fill('Interviews only');
    await dialog.getByRole('button', { name: 'Save view' }).click();
    await expect(page.getByText('View saved')).toBeVisible();

    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page.getByText('2 applications in total.')).toBeVisible();

    // Survives a reload because it lives in the database, not the browser.
    await page.reload();
    await page.getByRole('button', { name: 'Interviews only', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue('interview');
    await expect(page.getByText('1 of 2 applications match your filters.')).toBeVisible();

    await page.getByRole('button', { name: 'Delete view Interviews only' }).click();
    await expect(page.getByText('View deleted')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Interviews only', exact: true })).toHaveCount(0);
  });
});

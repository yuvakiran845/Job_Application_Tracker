import { expect, test } from '@playwright/test';
import { createApplicationViaApi, localDate, signUpViaApi } from './helpers.js';

const TABLE = 'All applications';

function rowFor(page, company) {
  return page
    .getByRole('table', { name: TABLE })
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader').getByRole('link', { name: company, exact: true }) });
}

test.describe('Managing applications', () => {
  test('add, edit, change status, view details, and delete — and it all persists', async ({ page }) => {
    await signUpViaApi(page);
    await page.goto('/applications');
    await expect(page.getByText('No applications yet')).toBeVisible();

    // Add: required fields are validated before anything is sent.
    await page.getByRole('banner').getByRole('button', { name: 'Add application' }).click();
    const addDialog = page.getByRole('dialog', { name: 'Add application' });
    await addDialog.getByRole('button', { name: 'Add application' }).click();
    await expect(addDialog.getByText('Company is required.')).toBeVisible();
    await expect(addDialog.getByText('Job title is required.')).toBeVisible();

    await addDialog.getByLabel('Company').fill('Northwind Labs');
    await addDialog.getByLabel('Job title').fill('Frontend Engineer');
    await addDialog.getByLabel('Location').fill('Bengaluru');
    await addDialog.getByLabel('Status').selectOption('applied');
    await addDialog.getByLabel('Email').fill('not-an-email');
    await addDialog.getByRole('button', { name: 'Add application' }).click();
    await expect(addDialog.getByText('Enter a valid email address.')).toBeVisible();
    await addDialog.getByLabel('Email').fill('priya@example.com');
    await addDialog.getByRole('button', { name: 'Add application' }).click();

    await expect(page.getByText('Application added')).toBeVisible();
    await expect(addDialog).toBeHidden();
    await expect(rowFor(page, 'Northwind Labs')).toContainText('Frontend Engineer');
    await expect(page.getByText('1 application in total.')).toBeVisible();

    // Edit through the row's actions menu.
    await rowFor(page, 'Northwind Labs').getByRole('button', { name: /^More actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit application' });
    await expect(editDialog.getByLabel('Company')).toHaveValue('Northwind Labs');
    await editDialog.getByLabel('Job title').fill('Senior Frontend Engineer');
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Changes saved')).toBeVisible();
    await expect(rowFor(page, 'Northwind Labs')).toContainText('Senior Frontend Engineer');

    // Status change straight from the table.
    await rowFor(page, 'Northwind Labs').getByRole('combobox', { name: /^Status for/ }).selectOption('interview');
    await expect(page.getByText('Status updated')).toBeVisible();

    // Everything above was saved on the server.
    await page.reload();
    await expect(rowFor(page, 'Northwind Labs').getByRole('combobox', { name: /^Status for/ })).toHaveValue('interview');

    // Details page, including the activity history.
    await rowFor(page, 'Northwind Labs').getByRole('link', { name: 'Northwind Labs' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Application details' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Senior Frontend Engineer' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'priya@example.com' })).toHaveAttribute('href', 'mailto:priya@example.com');
    await expect(page.getByText('Status changed from Applied to Interview')).toBeVisible();

    // Delete from the details page: confirm, then back to the list.
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: 'Delete application?' });
    await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await confirm.getByRole('button', { name: 'Delete application' }).click();
    await expect(page.getByText('Application deleted')).toBeVisible();
    await expect(page).toHaveURL(/\/applications$/);
    await expect(page.getByText('No applications yet')).toBeVisible();

    await page.reload();
    await expect(page.getByText('No applications yet')).toBeVisible();
  });

  test('search, status, location, and date filters combine on the server', async ({ page }) => {
    await signUpViaApi(page);
    const records = [
      { company: 'Northwind Labs', jobTitle: 'Frontend Engineer', location: 'Remote', status: 'interview', appliedDate: localDate(-5) },
      { company: 'Quillstone Systems', jobTitle: 'Backend Engineer', location: 'Pune', status: 'interview', appliedDate: localDate(-40) },
      { company: 'Brightpath', jobTitle: 'Product Designer', location: 'Remote', status: 'applied', appliedDate: localDate(-2) },
      { company: 'Lumenfield', jobTitle: 'Data Engineer', location: 'Remote (India)', status: 'offer', appliedDate: localDate(-20) },
      { company: 'Sablewood Games', jobTitle: 'Gameplay Engineer', location: 'Hyderabad', status: 'saved', appliedDate: '' },
    ];
    for (const record of records) await createApplicationViaApi(page, record);

    await page.goto('/applications');
    await expect(page.getByText('5 applications in total.')).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search by company or job title' }).fill('engineer');
    await expect(page.getByText('4 of 5 applications match your filters.')).toBeVisible();
    await expect(page).toHaveURL(/[?&]q=engineer/);

    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('interview');
    await expect(page.getByText('2 of 5 applications match your filters.')).toBeVisible();

    await page.getByRole('textbox', { name: 'Location', exact: true }).fill('remote');
    await expect(page.getByText('1 of 5 applications match your filters.')).toBeVisible();
    await expect(rowFor(page, 'Northwind Labs')).toBeVisible();

    // The filtered URL is shareable: a fresh load restores the same results.
    await page.reload();
    await expect(page.getByText('1 of 5 applications match your filters.')).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search by company or job title' })).toHaveValue('engineer');

    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page.getByText('5 applications in total.')).toBeVisible();

    // Applied-date range: only the last 10 days.
    await page.getByLabel('Applied from').fill(localDate(-10));
    await page.getByLabel('Applied to').fill(localDate(0));
    await expect(page.getByText('2 of 5 applications match your filters.')).toBeVisible();

    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await page.getByRole('searchbox', { name: 'Search by company or job title' }).fill('no such company');
    await expect(page.getByText('No matching applications')).toBeVisible();
  });

  test('malformed and unknown application links show "not found"', async ({ page }) => {
    await signUpViaApi(page);

    for (const id of ['not-a-real-id', '000000000000000000000000']) {
      await page.goto(`/applications/${id}`);
      await expect(page.getByText('Application not found')).toBeVisible();
      await expect(page.getByRole('link', { name: 'View all applications' })).toBeVisible();
    }

    const malformed = await page.request.get('/api/applications/not-a-real-id');
    expect(malformed.status()).toBe(400);
    expect((await malformed.json()).error.code).toBe('INVALID_ID');

    const unknown = await page.request.get('/api/applications/000000000000000000000000');
    expect(unknown.status()).toBe(404);

    await page.goto('/no/such/page');
    await expect(page.getByText('We couldn’t find that page')).toBeVisible();
  });

  test('the API rejects invalid input with field-level errors', async ({ page }) => {
    await signUpViaApi(page);
    const headers = { 'X-CSRF-Protection': '1' };

    const response = await page.request.post('/api/applications', {
      data: { company: '', jobTitle: 'x'.repeat(500), location: 'Remote', status: 'hired', appliedDate: '2026-02-31' },
      headers,
    });
    expect(response.status()).toBe(400);
    const { error } = await response.json();
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(error.details.fieldErrors)).toEqual(expect.arrayContaining(['company', 'jobTitle', 'status', 'appliedDate']));

    // Unknown fields such as userId are stripped: the record stays with its owner.
    const created = await createApplicationViaApi(page);
    const update = await page.request.put(`/api/applications/${created.id}`, {
      data: { userId: '000000000000000000000000', jobTitle: 'Renamed role' },
      headers,
    });
    expect(update.status()).toBe(200);
    const reread = await page.request.get(`/api/applications/${created.id}`);
    expect(reread.status()).toBe(200);
    expect((await reread.json()).data.jobTitle).toBe('Renamed role');
  });
});

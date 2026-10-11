import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { resetSampleData } from '../services/applicationService';
import { getRowCompanies, getRowFor, getStatValue, renderApp } from '../test/renderApp';

const TABLE = 'All applications';

async function openApplications() {
  const result = renderApp('/applications');
  await screen.findByRole('table', { name: TABLE });
  return result;
}

async function openRowMenu(user, company) {
  const row = getRowFor(TABLE, company);
  await user.click(within(row).getByRole('button', { name: /^More actions for/ }));
  return screen.getByRole('menu');
}

beforeEach(async () => {
  await resetSampleData();
});

describe('status changes', () => {
  it('changes status inline and updates dashboard counts', async () => {
    const { user } = await openApplications();
    const select = within(getRowFor(TABLE, 'Northwind Labs')).getByRole('combobox', { name: /^Status for/ });

    await user.selectOptions(select, 'offer');
    expect(await screen.findByText('Status updated')).toBeTruthy();
    expect(screen.getByText('Frontend Engineer at Northwind Labs moved to Offer.')).toBeTruthy();
    expect(select.value).toBe('offer');

    await user.click(screen.getByRole('link', { name: 'Dashboard' }));
    expect(await getStatValue('Offers')).toBe('2');
    expect(await getStatValue('Interviews')).toBe('1');
  });

  it('records today as the applied date when a saved job is submitted', async () => {
    const { user } = await openApplications();
    const row = getRowFor(TABLE, 'Sablewood Games');
    expect(within(row).getByText('Not applied yet')).toBeTruthy();

    await user.selectOptions(within(row).getByRole('combobox', { name: /^Status for/ }), 'applied');
    expect(await screen.findByText(/Applied date set to today\./)).toBeTruthy();
    expect(within(getRowFor(TABLE, 'Sablewood Games')).queryByText('Not applied yet')).toBeNull();
  });
});

describe('edit', () => {
  it('pre-fills the form, validates, and saves changes', async () => {
    const { user } = await openApplications();
    const menu = await openRowMenu(user, 'Northwind Labs');
    await user.click(within(menu).getByRole('menuitem', { name: 'Edit' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit application' });
    expect(within(dialog).getByLabelText(/^Company/).value).toBe('Northwind Labs');
    expect(within(dialog).getByLabelText(/^Status/).value).toBe('interview');
    expect(within(dialog).getByLabelText('Name').value).toBe('Priya Raman');

    const jobTitle = within(dialog).getByLabelText(/^Job title/);
    await user.clear(jobTitle);
    await user.type(jobTitle, 'Senior Frontend Engineer');
    const email = within(dialog).getByLabelText('Email');
    await user.clear(email);
    await user.type(email, 'not-an-email');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByText('Enter a valid email address.')).toBeTruthy();

    await user.clear(email);
    await user.type(email, 'priya@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(within(getRowFor(TABLE, 'Northwind Labs')).getByText('Senior Frontend Engineer')).toBeTruthy();
  });
});

describe('delete', () => {
  it('requires confirmation and can be cancelled', async () => {
    const { user } = await openApplications();
    const menu = await openRowMenu(user, 'Northwind Labs');
    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog', { name: 'Delete application?' });
    expect(within(dialog).getByText(/permanently removes Frontend Engineer at Northwind Labs/)).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }));

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(getRowCompanies(TABLE)).toContain('Northwind Labs');
  });

  it('deletes after confirmation and updates the list', async () => {
    const { user } = await openApplications();
    const menu = await openRowMenu(user, 'Northwind Labs');
    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete application?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete application' }));

    expect(await screen.findByText('Application deleted')).toBeTruthy();
    await waitFor(() => expect(getRowCompanies(TABLE)).not.toContain('Northwind Labs'));
    expect(screen.getByText('11 applications in total.')).toBeTruthy();
  });
});

describe('details page', () => {
  it('opens from the list and shows every field', async () => {
    const { user, router } = await openApplications();
    await user.click(within(getRowFor(TABLE, 'Northwind Labs')).getByRole('link', { name: 'Northwind Labs' }));

    expect(router.state.location.pathname).toBe('/applications/sample-1');
    expect(screen.getByRole('heading', { level: 1, name: 'Application details' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Frontend Engineer' })).toBeTruthy();
    expect(screen.getByText('Priya Raman')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'priya.raman@example.com' }).getAttribute('href')).toBe(
      'mailto:priya.raman@example.com',
    );
    expect(screen.getByText('₹14–18 LPA')).toBeTruthy();
  });

  it('returns to the list after deleting', async () => {
    const { user, router } = renderApp('/applications/sample-1');
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete application' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/applications'));
    expect(await screen.findByText('Application deleted')).toBeTruthy();
  });

  it('shows a not-found state for unknown IDs', async () => {
    renderApp('/applications/does-not-exist');
    expect(await screen.findByText('Application not found')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View all applications' })).toBeTruthy();
  });
});

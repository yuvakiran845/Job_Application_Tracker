import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { resetSampleData } from '../services/applicationService';
import { getRowCompanies, getRows, renderApp } from '../test/renderApp';

const TABLE = 'All applications';
// Text filters commit to the URL after a 300 ms debounce, then the list re-renders.
// Under full-suite CPU load that can exceed waitFor's 1 s default.
const DEBOUNCED = { timeout: 4000 };

async function openApplications(path = '/applications') {
  const result = renderApp(path);
  await screen.findByRole('table', { name: TABLE });
  return result;
}

beforeEach(async () => {
  await resetSampleData();
});

describe('applications list: search, filters, sorting and pagination', () => {
  it('paginates ten rows at a time', async () => {
    const { user, router } = await openApplications();
    const pagination = screen.getByRole('navigation', { name: 'Pagination' });
    expect(pagination.textContent).toContain('Showing 1–10 of 12');
    expect(within(pagination).getByRole('button', { name: 'Previous page' }).disabled).toBe(true);

    await user.click(within(pagination).getByRole('button', { name: 'Next page' }));
    expect(getRows(TABLE)).toHaveLength(2);
    expect(pagination.textContent).toContain('Showing 11–12 of 12');
    expect(router.state.location.search).toBe('?page=2');
  });

  it('searches by company or job title and combines with the status filter', async () => {
    const { user, router } = await openApplications();

    await user.type(screen.getByRole('searchbox', { name: 'Search by company or job title' }), 'engineer');
    await waitFor(() => expect(getRows(TABLE)).toHaveLength(5), DEBOUNCED);
    expect(screen.getByText('5 of 12 applications match your filters.')).toBeTruthy();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'interview');
    expect(getRowCompanies(TABLE)).toEqual(['Northwind Labs']);
    expect(router.state.location.search).toBe('?q=engineer&status=interview');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(getRows(TABLE)).toHaveLength(10), DEBOUNCED);
    expect(screen.getByRole('searchbox', { name: 'Search by company or job title' }).value).toBe('');
    expect(router.state.location.search).toBe('');
  });

  it('filters by location', async () => {
    const { user } = await openApplications();
    await user.type(screen.getByRole('textbox', { name: 'Location' }), 'remote');
    await waitFor(
      () => expect(getRowCompanies(TABLE).sort()).toEqual(['Arclight Media', 'Fernleaf Studio', 'Quillstone Systems']),
      DEBOUNCED,
    );
  });

  it('restores filters from the URL and shows an empty state when nothing matches', async () => {
    renderApp('/applications?q=northwind&status=offer');
    expect(await screen.findByText('No matching applications')).toBeTruthy();
    expect(screen.queryByRole('table', { name: TABLE })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Status' }).value).toBe('offer');
    expect(screen.getByRole('searchbox', { name: 'Search by company or job title' }).value).toBe('northwind');
  });

  it('sorts by clicking column headers', async () => {
    const { user, router } = await openApplications();
    const companyHeader = () => screen.getByRole('columnheader', { name: /Company/ });

    await user.click(within(companyHeader()).getByRole('button'));
    expect(companyHeader().getAttribute('aria-sort')).toBe('ascending');
    expect(getRowCompanies(TABLE)[0]).toBe('Arclight Media');
    expect(router.state.location.search).toBe('?sort=company&order=asc');

    await user.click(within(companyHeader()).getByRole('button'));
    expect(companyHeader().getAttribute('aria-sort')).toBe('descending');
    expect(getRowCompanies(TABLE)[0]).toBe('Tidewater Fintech');
  });

  it('sorts with the sort menu', async () => {
    const { user } = await openApplications();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'status:asc');
    expect(getRowCompanies(TABLE)[0]).toBe('Sablewood Games'); // the only "Saved" job
  });
});

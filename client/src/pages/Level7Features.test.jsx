import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { resetSampleData } from '../services/applicationService';
import { getRowCompanies, getRowFor, renderApp } from '../test/renderApp';

beforeEach(async () => {
  await resetSampleData();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const column = (name) => screen.getByRole('region', { name });
const cardCompanies = (name) =>
  within(column(name))
    .queryAllByRole('listitem')
    .map((item) => within(item).getByRole('link').textContent);

describe('pipeline (Kanban)', () => {
  it('shows one column per status with counts', async () => {
    renderApp('/pipeline');
    await waitFor(() => expect(cardCompanies('Interview')).toEqual(['Northwind Labs', 'Tidewater Fintech']));
    expect(cardCompanies('Offer')).toEqual(['Brightpath Health']);
    expect(cardCompanies('Saved')).toEqual(['Sablewood Games']);
    expect(within(column('Applied')).getByText('3')).toBeTruthy();
  });

  it('moves a card with its status menu (keyboard and touch alternative)', async () => {
    const { user } = renderApp('/pipeline');
    await waitFor(() => expect(cardCompanies('Interview')).toContain('Northwind Labs'));

    const card = within(column('Interview')).getByRole('link', { name: 'Northwind Labs' }).closest('li');
    await user.selectOptions(within(card).getByRole('combobox', { name: /^Status for/ }), 'offer');

    await waitFor(() => expect(cardCompanies('Offer')).toEqual(expect.arrayContaining(['Northwind Labs', 'Brightpath Health'])));
    expect(cardCompanies('Interview')).toEqual(['Tidewater Fintech']);
    expect(await screen.findByText('Status updated')).toBeTruthy();
  });

  it('moves a card by drag and drop', async () => {
    renderApp('/pipeline');
    await waitFor(() => expect(cardCompanies('Applied')).toContain('Quillstone Systems'));
    const dataTransfer = { setData: vi.fn(), getData: vi.fn(), effectAllowed: '', dropEffect: '' };

    const card = within(column('Applied')).getByRole('link', { name: 'Quillstone Systems' }).closest('li');
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(column('Assessment'), { dataTransfer });
    fireEvent.drop(column('Assessment'), { dataTransfer });

    await waitFor(() => expect(cardCompanies('Assessment')).toContain('Quillstone Systems'));
    expect(cardCompanies('Applied')).not.toContain('Quillstone Systems');
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'sample-4');
  });
});

describe('calendar', () => {
  it('lists upcoming interviews and deadlines with stage-specific labels', async () => {
    renderApp('/calendar');
    const agenda = await screen.findByRole('region', { name: 'Upcoming' });
    await waitFor(() => expect(within(agenda).getAllByRole('listitem').length).toBeGreaterThanOrEqual(6));

    expect(within(agenda).getByRole('link', { name: 'Frontend Engineer at Northwind Labs' })).toBeTruthy();
    expect(within(agenda).getByText('Offer response due')).toBeTruthy(); // Brightpath (offer)
    expect(within(agenda).getAllByText('Assessment due')).toHaveLength(2); // Lumenfield, Pinecrest
    expect(within(agenda).getByText('Application deadline')).toBeTruthy(); // Sablewood (saved)
    expect(screen.getByText(/Interview times are shown in your time zone/)).toBeTruthy();
  });

  it('supports keyboard navigation between days', async () => {
    const { user } = renderApp('/calendar');
    const today = await screen.findByRole('button', { pressed: true });
    expect(today.getAttribute('aria-current')).toBe('date');

    today.focus();
    await user.keyboard('{ArrowRight}');
    const selected = screen.getByRole('button', { pressed: true });
    expect(selected).not.toBe(today);
    expect(document.activeElement).toBe(selected);
    expect(today.getAttribute('tabindex')).toBe('-1');
  });
});

describe('analytics', () => {
  // The Analytics page is lazy-loaded with the charting library; the first load in
  // jsdom can take a few seconds.
  const LAZY = { timeout: 10_000 };
  const statValue = (label) =>
    within(screen.getByRole('group', { name: label })).getByText(/^(\d+%?|—)$/).textContent;

  it('computes rates from submitted applications in the selected range', async () => {
    const { user, router } = renderApp('/analytics');
    await screen.findByRole('group', { name: 'Submitted' }, LAZY);
    // Last 90 days (default): the 11 sample applications with an applied date.
    expect(statValue('Submitted')).toBe('11');
    expect(statValue('Response rate')).toBe('64%'); // 7 of 11
    expect(statValue('Interview rate')).toBe('27%'); // 3 of 11
    expect(statValue('Offer rate')).toBe('9%'); // 1 of 11

    await user.click(screen.getByRole('button', { name: 'Last 30 days' }));
    expect(router.state.location.search).toBe('?range=30d');
    await waitFor(() => expect(statValue('Submitted')).toBe('8'));
    expect(statValue('Response rate')).toBe('63%'); // 5 of 8
  });

  it('offers a table view of the chart and explains the definitions', async () => {
    const { user } = renderApp('/analytics?range=30d');
    await user.click(await screen.findByRole('button', { name: 'Show table' }, LAZY));
    const table = screen.getByRole('table', { name: /Applications submitted per week/ });
    const counts = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => Number(within(row).getByRole('cell').textContent));
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(8);
    expect(screen.getByText(/Rates use each application’s current status/)).toBeTruthy();
  });
});

describe('activity timeline', () => {
  it('starts empty for existing records and records changes as they happen', async () => {
    const { user } = renderApp('/applications/sample-1');
    expect(await screen.findByText(/No activity recorded yet/)).toBeTruthy();

    await user.selectOptions(await screen.findByRole('combobox', { name: /^Status for/ }), 'offer');
    expect(await screen.findByText('Status changed from Interview to Offer')).toBeTruthy();
  });
});

describe('CSV export', () => {
  it('downloads the applications matching the current filters', async () => {
    let exported;
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn((blob) => {
        exported = blob;
        return 'blob:test';
      }),
      revokeObjectURL: vi.fn(),
    }));
    const { user } = renderApp('/applications?status=interview');
    await waitFor(() => expect(getRowCompanies('All applications')).toHaveLength(2));

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await screen.findByText('Export ready')).toBeTruthy();

    const lines = (await exported.text()).replace(String.fromCharCode(0xfeff), '').trim().split('\r\n');
    expect(lines[0]).toMatch(/^Company,Job title,Location,Status,/);
    expect(lines).toHaveLength(3); // header + 2 interviews
    expect(lines.slice(1).every((line) => line.includes(',Interview,'))).toBe(true);
  });
});

describe('saved views', () => {
  it('saves the current filters and re-applies them in one click', async () => {
    const { user, router } = renderApp('/applications?status=interview&sort=company&order=asc');
    await waitFor(() => expect(getRowCompanies('All applications')).toEqual(['Northwind Labs', 'Tidewater Fintech']));

    await user.click(screen.getByRole('button', { name: 'Save view' }));
    const dialog = screen.getByRole('dialog', { name: 'Save this view' });
    await user.type(within(dialog).getByLabelText('View name'), 'Interviews A–Z');
    await user.click(within(dialog).getByRole('button', { name: 'Save view' }));

    const chip = await screen.findByRole('button', { name: 'Interviews A–Z' });
    expect(chip.getAttribute('aria-pressed')).toBe('true');

    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    await waitFor(() => expect(getRowCompanies('All applications')).toHaveLength(10));

    await user.click(screen.getByRole('button', { name: 'Interviews A–Z' }));
    await waitFor(() => expect(router.state.location.search).toBe('?status=interview&sort=company&order=asc'));
    await waitFor(() => expect(getRowCompanies('All applications')).toEqual(['Northwind Labs', 'Tidewater Fintech']));
    expect(within(getRowFor('All applications', 'Northwind Labs')).getByRole('combobox', { name: /^Status for/ }).value).toBe('interview');
  });
});

describe('dashboard', () => {
  it('shows what is coming up next', async () => {
    renderApp('/');
    const upcoming = await screen.findByRole('region', { name: 'Upcoming' });
    expect(await within(upcoming).findByRole('link', { name: 'Frontend Engineer at Northwind Labs' })).toBeTruthy();
  });
});

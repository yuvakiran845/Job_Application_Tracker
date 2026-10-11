import { render, screen, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import App from '../App';
import { routes } from '../routes';

/** Renders the full app at `path` with an in-memory router. */
export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  // jsdom doesn't load our CSS, so the per-event pointer-events check only costs time.
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  render(<App router={router} />);
  return { router, user };
}

/** Data rows (excluding the header row) of the table with the given caption. */
export function getRows(tableName) {
  const table = screen.getByRole('table', { name: tableName });
  return within(table).getAllByRole('row').slice(1);
}

export function getRowCompanies(tableName) {
  return getRows(tableName).map((row) => within(within(row).getByRole('rowheader')).getByRole('link').textContent);
}

export function getRowFor(tableName, company) {
  const row = getRows(tableName).find((item) => within(within(item).getByRole('rowheader')).getByRole('link').textContent === company);
  if (!row) throw new Error(`No row for ${company} in "${tableName}"`);
  return row;
}

export async function getStatValue(label) {
  const card = await screen.findByRole('group', { name: label });
  return within(card).getByText(/^\d+$/).textContent;
}

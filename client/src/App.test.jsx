import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import App from './App';
import { buildSampleApplications } from './data/sampleApplications';
import { routes } from './routes';
import { resetSampleData } from './services/applicationService';

const SAMPLE = buildSampleApplications();
const countStatus = (status) => SAMPLE.filter((application) => application.status === status).length;

function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<App router={router} />);
  return router;
}

async function getStatValue(label) {
  const card = await screen.findByRole('group', { name: label });
  return within(card).getByText(/^\d+$/).textContent;
}

beforeEach(async () => {
  await resetSampleData();
});

describe('dashboard', () => {
  it('shows stats calculated from the sample data', async () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
    expect(await getStatValue('Total applications')).toBe(String(SAMPLE.length));
    expect(await getStatValue('Interviews')).toBe(String(countStatus('interview')));
    expect(await getStatValue('Offers')).toBe(String(countStatus('offer')));
    expect(await getStatValue('Rejections')).toBe(String(countStatus('rejected')));
  });

  it('navigates to the applications page from the sidebar', async () => {
    const user = userEvent.setup();
    const router = renderApp();
    await user.click(screen.getByRole('link', { name: 'Applications' }));

    expect(router.state.location.pathname).toBe('/applications');
    expect(screen.getByRole('heading', { level: 1, name: 'Applications' })).toBeTruthy();
    const table = await screen.findByRole('table', { name: 'All applications' });
    // One header row plus one row per application.
    expect(within(table).getAllByRole('row')).toHaveLength(SAMPLE.length + 1);
  });

  it('shows a not-found page for unknown routes', () => {
    renderApp('/does-not-exist');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toBeTruthy();
  });
});

describe('add application', () => {
  it('validates input, then adds the application to the table and counts', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole('table', { name: 'Recently added applications' });

    await user.click(screen.getByRole('button', { name: 'Add application' }));
    const dialog = screen.getByRole('dialog', { name: 'Add application' });
    const submit = within(dialog).getByRole('button', { name: 'Add application' });

    // Submitting the empty form shows errors and focuses the first invalid field.
    await user.click(submit);
    expect(within(dialog).getByText('Please fix 3 fields highlighted below.')).toBeTruthy();
    expect(within(dialog).getByText('Company is required.')).toBeTruthy();
    expect(within(dialog).getByText('Job title is required.')).toBeTruthy();
    expect(within(dialog).getByText('Location is required.')).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByLabelText(/^Company/));

    await user.type(within(dialog).getByLabelText(/^Company/), 'Acme Robotics');
    await user.type(within(dialog).getByLabelText(/^Job title/), 'Junior Developer');
    await user.type(within(dialog).getByLabelText(/^Location/), 'Kochi, India');
    await user.selectOptions(within(dialog).getByLabelText(/^Status/), 'interview');
    await user.type(within(dialog).getByLabelText(/^Job posting URL/), 'not-a-url');
    await user.click(submit);
    expect(within(dialog).getByText('Enter a full URL starting with http:// or https://.')).toBeTruthy();

    const urlInput = within(dialog).getByLabelText(/^Job posting URL/);
    await user.clear(urlInput);
    await user.type(urlInput, 'https://jobs.example.com/acme/junior-developer');
    await user.click(submit);

    expect(await screen.findByText('Application added')).toBeTruthy();
    expect(screen.getByText('Junior Developer at Acme Robotics')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    expect(await getStatValue('Total applications')).toBe(String(SAMPLE.length + 1));
    expect(await getStatValue('Interviews')).toBe(String(countStatus('interview') + 1));

    const table = screen.getByRole('table', { name: 'Recently added applications' });
    const firstRow = within(table).getAllByRole('row')[1];
    expect(within(firstRow).getByText('Acme Robotics')).toBeTruthy();
    expect(within(firstRow).getByText('Junior Developer')).toBeTruthy();
    expect(within(firstRow).getByText('Interview')).toBeTruthy();
  });

  it('closes without saving when cancelled', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole('table', { name: 'Recently added applications' });

    await user.click(screen.getByRole('button', { name: 'Add application' }));
    const dialog = screen.getByRole('dialog', { name: 'Add application' });
    await user.type(within(dialog).getByLabelText(/^Company/), 'Discarded Co');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Discarded Co')).toBeNull();
    expect(await getStatValue('Total applications')).toBe(String(SAMPLE.length));
  });
});

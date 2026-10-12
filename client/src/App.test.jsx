import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { buildSampleApplications } from './data/sampleApplications';
import { resetSampleData } from './services/applicationService';
import { getRows, getStatValue, renderApp } from './test/renderApp';

const SAMPLE = buildSampleApplications();
const countStatus = (status) => SAMPLE.filter((application) => application.status === status).length;
const RECENT = 'Recent applications';

beforeEach(async () => {
  await resetSampleData();
});

describe('dashboard', () => {
  it('shows stats calculated from the sample data', async () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1, name: /^Welcome back!/ })).toBeTruthy();
    expect(await getStatValue('Applications')).toBe(String(SAMPLE.length));
    expect(await getStatValue('Interviews')).toBe(String(countStatus('interview')));
    expect(await getStatValue('Offers')).toBe(String(countStatus('offer')));
    // Same definition as Analytics: 7 of the 11 submitted applications got a response.
    const responseRate = screen.getByRole('group', { name: 'Response rate' });
    expect(within(responseRate).getByText('64%')).toBeTruthy();
    expect(within(responseRate).getByText('7 of 11 applications')).toBeTruthy();
  });

  it('navigates to the applications page from the top bar', async () => {
    const { router, user } = renderApp();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    await user.click(within(nav).getByRole('link', { name: 'My Applications' }));

    expect(router.state.location.pathname).toBe('/applications');
    expect(screen.getByRole('heading', { level: 1, name: 'My Applications' })).toBeTruthy();
    await screen.findByRole('table', { name: 'All applications' });
    expect(getRows('All applications')).toHaveLength(10); // first page
  });

  it('shows a not-found page for unknown routes', () => {
    renderApp('/does-not-exist');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toBeTruthy();
  });
});

describe('add application', () => {
  it('validates input, then adds the application to the table and counts', async () => {
    const { user } = renderApp();
    await screen.findByRole('list', { name: RECENT });

    await user.click(screen.getByRole('button', { name: 'Add Job' }));
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

    expect(await getStatValue('Applications')).toBe(String(SAMPLE.length + 1));
    expect(await getStatValue('Interviews')).toBe(String(countStatus('interview') + 1));

    const [firstItem] = within(screen.getByRole('list', { name: RECENT })).getAllByRole('listitem');
    expect(within(firstItem).getByRole('link', { name: 'Junior Developer at Acme Robotics' })).toBeTruthy();
    expect(within(firstItem).getByText('Interview')).toBeTruthy();
    expect(within(firstItem).getByText('Added today')).toBeTruthy();
  });

  it('closes without saving when cancelled', async () => {
    const { user } = renderApp();
    await screen.findByRole('list', { name: RECENT });

    await user.click(screen.getByRole('button', { name: 'Add Job' }));
    const dialog = screen.getByRole('dialog', { name: 'Add application' });
    await user.type(within(dialog).getByLabelText(/^Company/), 'Discarded Co');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Discarded Co')).toBeNull();
    expect(await getStatValue('Applications')).toBe(String(SAMPLE.length));
  });
});

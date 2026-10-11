import { expect, test } from '@playwright/test';
import { createApplicationViaApi, signUpViaApi } from './helpers.js';

const CSRF = { 'X-CSRF-Protection': '1' };

test('one user can never see, change, delete, or export another user’s data', async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alice = await aliceContext.newPage();
  const bob = await bobContext.newPage();

  try {
    await signUpViaApi(alice, { name: 'Alice' });
    await signUpViaApi(bob, { name: 'Bob' });
    const secret = await createApplicationViaApi(alice, { company: 'Alice Private Co', jobTitle: 'Staff Engineer' });
    const aliceView = await alice.request.post('/api/views', {
      data: { name: 'Alice view', query: 'status=applied' },
      headers: CSRF,
    });
    expect(aliceView.status()).toBe(201);
    const viewId = (await aliceView.json()).data.id;

    // UI: Bob's account is empty, and Alice's link is "not found" for him.
    await bob.goto('/applications');
    await expect(bob.getByText('No applications yet')).toBeVisible();
    await bob.goto(`/applications/${secret.id}`);
    await expect(bob.getByText('Application not found')).toBeVisible();
    await expect(bob.getByText('Alice Private Co')).toHaveCount(0);

    // API: every route answers as if the record didn't exist.
    expect((await bob.request.get(`/api/applications/${secret.id}`)).status()).toBe(404);
    expect((await bob.request.get(`/api/applications/${secret.id}/activity`)).status()).toBe(404);
    expect(
      (await bob.request.put(`/api/applications/${secret.id}`, { data: { status: 'rejected' }, headers: CSRF })).status(),
    ).toBe(404);
    expect((await bob.request.delete(`/api/applications/${secret.id}`, { headers: CSRF })).status()).toBe(404);
    expect((await bob.request.delete(`/api/views/${viewId}`, { headers: CSRF })).status()).toBe(404);

    const list = await (await bob.request.get('/api/applications')).json();
    expect(list.meta.total).toBe(0);
    const stats = await (await bob.request.get('/api/applications/stats')).json();
    expect(stats.data.total).toBe(0);
    const views = await (await bob.request.get('/api/views')).json();
    expect(views.data).toEqual([]);

    const exported = await bob.request.get('/api/applications/export');
    expect(exported.status()).toBe(200);
    const csv = await exported.text();
    expect(csv).not.toContain('Alice Private Co');
    expect(csv.trim().split('\r\n')).toHaveLength(1); // header row only

    // Alice's data is untouched by Bob's attempts.
    const mine = await alice.request.get(`/api/applications/${secret.id}`);
    expect(mine.status()).toBe(200);
    expect((await mine.json()).data.status).toBe('applied');
    expect((await (await alice.request.get('/api/views')).json()).data).toHaveLength(1);
  } finally {
    await aliceContext.close();
    await bobContext.close();
  }
});

import { describe, expect, it } from 'vitest';
import { Application } from '../src/models/Application.js';
import { buildListQuery, buildStatsPipeline } from '../src/services/applicationService.js';
import { buildSampleDocuments, seedApplications } from '../scripts/seedData.js';
import { DEV_USER_ID, OTHER_USER_ID, api } from './helpers.js';

const DEFAULT_QUERY = {
  q: '',
  status: '',
  location: '',
  from: '',
  to: '',
  sort: 'createdAt',
  order: 'desc',
  page: 1,
  pageSize: 10,
};

async function explainPlan(pipeline, collation) {
  const aggregate = Application.aggregate(pipeline);
  if (collation) aggregate.collation(collation);
  return JSON.stringify(await aggregate.explain('queryPlanner'));
}

describe('indexes', () => {
  it('creates the owner-scoped indexes', async () => {
    const keys = (await Application.collection.indexes()).map((index) => index.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        { userId: 1, createdAt: -1 },
        { userId: 1, status: 1 },
        { userId: 1, appliedDate: -1 },
        { userId: 1, deadline: 1 },
      ]),
    );
  });

  it.each([
    ['default list', {}],
    ['status filter', { status: 'interview' }],
    ['search + location + date range', { q: 'engineer', location: 'india', from: '2026-01-01' }],
    ['company sort (with collation)', { sort: 'company', order: 'asc' }],
  ])('serves the %s with an index scan, not a collection scan', async (_label, overrides) => {
    await seedApplications({ userId: DEV_USER_ID });
    const { pipeline, collation } = buildListQuery(DEV_USER_ID, { ...DEFAULT_QUERY, ...overrides });
    const plan = await explainPlan(pipeline, collation);
    expect(plan).toContain('IXSCAN');
    expect(plan).not.toContain('COLLSCAN');
  });

  it('serves dashboard stats with an index scan', async () => {
    const plan = await explainPlan(buildStatsPipeline(DEV_USER_ID, '2026-01-01'));
    expect(plan).toContain('IXSCAN');
    expect(plan).not.toContain('COLLSCAN');
  });
});

describe('development seed', () => {
  it('inserts the sample applications for the given user, newest first through the API', async () => {
    const count = await seedApplications({ userId: DEV_USER_ID });
    expect(count).toBe(buildSampleDocuments(DEV_USER_ID).length);

    const response = await api().get('/api/applications?pageSize=100').expect(200);
    expect(response.body.meta.total).toBe(count);
    expect(response.body.data[0].company).toBe('Arclight Media');
    // Accent/case-insensitive search works on seeded data, so the hooks ran.
    expect((await api().get('/api/applications?q=NORTHWIND')).body.data).toHaveLength(1);
  });

  it('keeps the sample creation dates instead of "now"', async () => {
    await seedApplications({ userId: DEV_USER_ID });
    const oldest = await Application.findOne({ company: 'Meridian Cloud' });
    const ageDays = (Date.now() - oldest.createdAt.getTime()) / 86_400_000;
    expect(ageDays).toBeGreaterThan(50);
  });

  it('refuses to overwrite existing data unless reset is requested', async () => {
    await seedApplications({ userId: DEV_USER_ID });
    await expect(seedApplications({ userId: DEV_USER_ID })).rejects.toThrow(/already has 12 application/);
    await expect(seedApplications({ userId: DEV_USER_ID, reset: true })).resolves.toBe(12);
    expect(await Application.countDocuments({ userId: DEV_USER_ID })).toBe(12);
  });

  it("never touches other users' applications", async () => {
    await Application.create({
      userId: OTHER_USER_ID,
      company: 'Someone Else Inc',
      jobTitle: 'Engineer',
      location: 'Remote',
      status: 'applied',
      appliedDate: '2026-10-01',
    });
    await seedApplications({ userId: DEV_USER_ID });
    await seedApplications({ userId: DEV_USER_ID, reset: true });
    expect(await Application.countDocuments({ userId: OTHER_USER_ID })).toBe(1);
  });
});

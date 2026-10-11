import { beforeEach, describe, expect, it } from 'vitest';
import {
  createApplication,
  deleteApplication,
  getApplication,
  getApplicationStats,
  listApplications,
  resetSampleData,
  updateApplication,
} from './mockApplicationService';
import { NotFoundError, ValidationError } from './errors';

beforeEach(async () => {
  await resetSampleData();
});

describe('applicationService (in-memory mock)', () => {
  it('creates an application with timestamps', async () => {
    const created = await createApplication({ company: 'Acme', jobTitle: 'Developer', location: 'Remote', status: 'saved' });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBe(created.updatedAt);
    expect((await listApplications()).items[0].id).toBe(created.id);
  });

  it('rejects invalid input with field errors', async () => {
    await expect(createApplication({ status: 'applied' })).rejects.toMatchObject({
      name: 'ValidationError',
      fieldErrors: { company: expect.any(String), jobTitle: expect.any(String), location: expect.any(String) },
    });
  });

  it('applies partial updates, keeps createdAt and bumps updatedAt', async () => {
    const {
      items: [first],
    } = await listApplications();
    const updated = await updateApplication(first.id, { jobTitle: 'Senior Engineer', contact: { phone: '+1 555 0100' } });

    expect(updated.jobTitle).toBe('Senior Engineer');
    expect(updated.company).toBe(first.company);
    expect(updated.contact).toEqual({ ...first.contact, phone: '+1 555 0100' });
    expect(updated.createdAt).toBe(first.createdAt);
    expect(updated.updatedAt >= first.updatedAt).toBe(true);
  });

  it('validates the merged record on update', async () => {
    const {
      items: [first],
    } = await listApplications();
    await expect(updateApplication(first.id, { company: '' })).rejects.toBeInstanceOf(ValidationError);
    expect((await getApplication(first.id)).company).toBe(first.company);
  });

  it('deletes an application', async () => {
    const before = await listApplications({ pageSize: 50 });
    await deleteApplication(before.items[0].id);
    const after = await listApplications({ pageSize: 50 });
    expect(after.meta.total).toBe(before.meta.total - 1);
    await expect(getApplication(before.items[0].id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lists like the API: filtered, sorted, paginated, with meta', async () => {
    const page = await listApplications({ q: 'engineer', sort: 'company', order: 'asc', pageSize: 2 });
    expect(page.meta).toEqual({ page: 1, pageSize: 2, total: 5, pageCount: 3 });
    expect(page.items.map((item) => item.company)).toEqual(['Arclight Media', 'Brightpath Health']);
  });

  it('computes stats in the API shape', async () => {
    const stats = await getApplicationStats({ appliedSince: '2000-01-01' });
    expect(stats.total).toBe(12);
    expect(stats.appliedSince).toEqual({ from: '2000-01-01', count: 11 }); // the saved job has no applied date
    expect(stats.byStatus.interview).toBe(stats.interviews);
  });

  it('reports missing records as NotFoundError', async () => {
    await expect(getApplication('missing-id')).rejects.toBeInstanceOf(NotFoundError);
    await expect(updateApplication('missing-id', { company: 'X' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteApplication('missing-id')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns copies, so callers cannot mutate the store', async () => {
    const {
      items: [first],
    } = await listApplications();
    first.company = 'Mutated';
    expect((await getApplication(first.id)).company).not.toBe('Mutated');
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import {
  createApplication,
  deleteApplication,
  listApplications,
  resetSampleData,
  updateApplication,
} from './applicationService';
import { NotFoundError, ValidationError } from './errors';

beforeEach(async () => {
  await resetSampleData();
});

describe('applicationService (in-memory mock)', () => {
  it('creates an application with timestamps', async () => {
    const created = await createApplication({ company: 'Acme', jobTitle: 'Developer', location: 'Remote', status: 'saved' });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBe(created.updatedAt);
    expect((await listApplications())[0].id).toBe(created.id);
  });

  it('rejects invalid input with field errors', async () => {
    await expect(createApplication({ status: 'applied' })).rejects.toMatchObject({
      name: 'ValidationError',
      fieldErrors: { company: expect.any(String), jobTitle: expect.any(String), location: expect.any(String) },
    });
  });

  it('applies partial updates, keeps createdAt and bumps updatedAt', async () => {
    const [first] = await listApplications();
    const updated = await updateApplication(first.id, { jobTitle: 'Senior Engineer', contact: { phone: '+1 555 0100' } });

    expect(updated.jobTitle).toBe('Senior Engineer');
    expect(updated.company).toBe(first.company);
    expect(updated.contact).toEqual({ ...first.contact, phone: '+1 555 0100' });
    expect(updated.createdAt).toBe(first.createdAt);
    expect(updated.updatedAt >= first.updatedAt).toBe(true);
  });

  it('validates the merged record on update', async () => {
    const [first] = await listApplications();
    await expect(updateApplication(first.id, { company: '' })).rejects.toBeInstanceOf(ValidationError);
    expect((await listApplications())[0].company).toBe(first.company);
  });

  it('deletes an application', async () => {
    const before = await listApplications();
    await deleteApplication(before[0].id);
    const after = await listApplications();
    expect(after).toHaveLength(before.length - 1);
    expect(after.some((item) => item.id === before[0].id)).toBe(false);
  });

  it('reports missing records as NotFoundError', async () => {
    await expect(updateApplication('missing-id', { company: 'X' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteApplication('missing-id')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns copies, so callers cannot mutate the store', async () => {
    const [first] = await listApplications();
    first.company = 'Mutated';
    expect((await listApplications())[0].company).not.toBe('Mutated');
  });
});

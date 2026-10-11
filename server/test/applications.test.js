import { describe, expect, it } from 'vitest';
import { Application } from '../src/models/Application.js';
import { utcDateString } from '../src/utils/dates.js';
import { OTHER_USER_ID, api, createMany, validApplication } from './helpers.js';

const MISSING_ID = '64b7f0c2a1b2c3d4e5f60718';

describe('POST /api/applications', () => {
  it('creates an application with defaults and returns 201 with a Location header', async () => {
    const response = await api()
      .post('/api/applications')
      .send(validApplication({ company: '  Northwind Labs  ', contact: { email: 'priya@example.com' } }))
      .expect(201);

    const { data } = response.body;
    expect(response.headers.location).toBe(`/api/applications/${data.id}`);
    expect(data).toMatchObject({
      company: 'Northwind Labs',
      status: 'applied',
      jobUrl: '',
      employmentType: '',
      deadline: '',
      interviewDate: '',
      contact: { name: '', email: 'priya@example.com', phone: '' },
    });
    expect(data.createdAt).toBe(data.updatedAt);
    // Internal and ownership fields are never exposed.
    expect(Object.keys(data)).not.toEqual(expect.arrayContaining(['_id', 'userId', 'searchText']));
    expect(data).not.toHaveProperty('_id');
    expect(data).not.toHaveProperty('userId');
  });

  it('ignores client-supplied owner and system fields', async () => {
    const response = await api()
      .post('/api/applications')
      .send(validApplication({ userId: OTHER_USER_ID, _id: MISSING_ID, createdAt: '2001-01-01T00:00:00Z' }))
      .expect(201);
    const stored = await Application.findById(response.body.data.id);
    expect(String(stored.userId)).not.toBe(OTHER_USER_ID);
    expect(String(stored._id)).not.toBe(MISSING_ID);
    expect(stored.createdAt.getUTCFullYear()).toBeGreaterThan(2001);
  });

  it('stores interview times as UTC instants', async () => {
    const response = await api()
      .post('/api/applications')
      .send(validApplication({ status: 'interview', interviewDate: '2026-10-15T10:30:00+05:30' }))
      .expect(201);
    expect(response.body.data.interviewDate).toBe('2026-10-15T05:00:00.000Z');
  });

  it('returns field errors for missing and invalid fields', async () => {
    const response = await api()
      .post('/api/applications')
      .send({
        company: '',
        status: 'ghosted',
        jobUrl: 'javascript:alert(1)',
        deadline: '2026-02-30',
        interviewDate: 'next tuesday',
        contact: { email: 'not-an-email', phone: 'call me' },
        notes: 'x'.repeat(2001),
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.fieldErrors).toEqual({
      company: 'Company is required.',
      jobTitle: 'Job title is required.',
      location: 'Location is required.',
      status: 'Choose a status.',
      jobUrl: 'Enter a full URL starting with http:// or https://.',
      deadline: 'Enter a valid date.',
      interviewDate: 'Enter a valid date and time.',
      'contact.email': 'Enter a valid email address.',
      'contact.phone': 'Enter a valid phone number.',
      notes: 'Notes must be 2000 characters or fewer.',
    });
  });

  it('rejects wrong types instead of coercing them', async () => {
    const response = await api().post('/api/applications').send(validApplication({ company: 42 })).expect(400);
    expect(response.body.error.details.fieldErrors.company).toBe('Company must be text.');
  });

  it('requires an applied date for submitted statuses but not for saved jobs', async () => {
    const response = await api()
      .post('/api/applications')
      .send(validApplication({ status: 'interview', appliedDate: '' }))
      .expect(400);
    expect(response.body.error.details.fieldErrors.appliedDate).toBe('Applied date is required for this status.');

    await api().post('/api/applications').send(validApplication({ status: 'saved', appliedDate: '' })).expect(201);
  });

  it('rejects applied dates in the future, allowing one day for time zones', async () => {
    await api().post('/api/applications').send(validApplication({ appliedDate: utcDateString(1) })).expect(201);
    const response = await api()
      .post('/api/applications')
      .send(validApplication({ appliedDate: utcDateString(3) }))
      .expect(400);
    expect(response.body.error.details.fieldErrors.appliedDate).toMatch(/future/);
  });

  it('rejects a body that is not an object', async () => {
    const response = await api().post('/api/applications').send([1, 2]).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/applications/:id', () => {
  it('returns the application', async () => {
    const [created] = await createMany(api(), [{}]);
    const response = await api().get(`/api/applications/${created.id}`).expect(200);
    expect(response.body.data).toEqual(created);
  });

  it('returns 404 for a missing ID and 400 for a malformed one', async () => {
    expect((await api().get(`/api/applications/${MISSING_ID}`).expect(404)).body.error.code).toBe('NOT_FOUND');
    expect((await api().get('/api/applications/not-an-id').expect(400)).body.error).toEqual({
      code: 'INVALID_ID',
      message: 'Invalid application ID.',
    });
  });
});

describe('PUT /api/applications/:id', () => {
  it('applies a partial update, keeping other fields and merging contact', async () => {
    const [created] = await createMany(api(), [{ contact: { name: 'Priya', email: 'priya@example.com' } }]);
    await new Promise((resolve) => setTimeout(resolve, 5));

    const response = await api()
      .put(`/api/applications/${created.id}`)
      .send({ jobTitle: 'Senior Frontend Engineer', contact: { phone: '+91 80 5550 1234' } })
      .expect(200);

    const { data } = response.body;
    expect(data.jobTitle).toBe('Senior Frontend Engineer');
    expect(data.company).toBe(created.company);
    expect(data.contact).toEqual({ name: 'Priya', email: 'priya@example.com', phone: '+91 80 5550 1234' });
    expect(data.createdAt).toBe(created.createdAt);
    expect(data.updatedAt > created.updatedAt).toBe(true);
  });

  it('validates the merged record', async () => {
    const [saved] = await createMany(api(), [{ status: 'saved', appliedDate: '' }]);
    const response = await api().put(`/api/applications/${saved.id}`).send({ status: 'interview' }).expect(400);
    expect(response.body.error.details.fieldErrors.appliedDate).toMatch(/required/);

    await api()
      .put(`/api/applications/${saved.id}`)
      .send({ status: 'interview', appliedDate: '2026-10-01' })
      .expect(200);
  });

  it('can clear optional fields', async () => {
    const [created] = await createMany(api(), [{ interviewDate: '2026-10-15T05:00:00.000Z', notes: 'Prep' }]);
    const response = await api()
      .put(`/api/applications/${created.id}`)
      .send({ interviewDate: null, notes: '' })
      .expect(200);
    expect(response.body.data).toMatchObject({ interviewDate: '', notes: '' });
  });

  it('rejects empty updates and unknown records', async () => {
    const [created] = await createMany(api(), [{}]);
    const empty = await api().put(`/api/applications/${created.id}`).send({}).expect(400);
    expect(empty.body.error.message).toBe('Provide at least one field to update.');
    await api().put(`/api/applications/${MISSING_ID}`).send({ company: 'X' }).expect(404);
  });
});

describe('DELETE /api/applications/:id', () => {
  it('deletes with 204 and then reports 404', async () => {
    const [created] = await createMany(api(), [{}]);
    const response = await api().delete(`/api/applications/${created.id}`).expect(204);
    expect(response.text).toBe('');
    await api().get(`/api/applications/${created.id}`).expect(404);
    await api().delete(`/api/applications/${created.id}`).expect(404);
  });
});

describe('ownership', () => {
  it("never exposes or changes another user's applications", async () => {
    const foreign = await Application.create({ ...validApplication({ company: 'Foreign Corp' }), userId: OTHER_USER_ID });
    const id = String(foreign._id);
    await createMany(api(), [{ company: 'Mine Ltd' }]);

    const list = await api().get('/api/applications').expect(200);
    expect(list.body.data.map((item) => item.company)).toEqual(['Mine Ltd']);

    await api().get(`/api/applications/${id}`).expect(404);
    await api().put(`/api/applications/${id}`).send({ company: 'Hacked' }).expect(404);
    await api().delete(`/api/applications/${id}`).expect(404);

    const stats = await api().get('/api/applications/stats').expect(200);
    expect(stats.body.data.total).toBe(1);

    const unchanged = await Application.findById(id);
    expect(unchanged.company).toBe('Foreign Corp');
  });
});

describe('GET /api/applications (list)', () => {
  async function seed() {
    return createMany(api(), [
      { company: 'Northwind Labs', jobTitle: 'Frontend Engineer', location: 'Bengaluru, India', status: 'interview', appliedDate: '2026-09-10' },
      { company: 'Zürich Data', jobTitle: 'Data Analyst', location: 'Zürich, Switzerland', appliedDate: '2026-09-20', deadline: '2026-10-20' },
      { company: 'fernleaf studio', jobTitle: 'Design Intern', location: 'Remote', appliedDate: '2026-10-01', deadline: '2026-10-15' },
      { company: 'Sablewood Games', jobTitle: 'Gameplay Programmer', location: 'Hyderabad, India', status: 'saved', appliedDate: '' },
    ]);
  }
  const companies = (response) => response.body.data.map((item) => item.company);

  it('returns newest first with pagination metadata', async () => {
    await seed();
    const response = await api().get('/api/applications').expect(200);
    expect(companies(response)).toEqual(['Sablewood Games', 'fernleaf studio', 'Zürich Data', 'Northwind Labs']);
    expect(response.body.meta).toEqual({ page: 1, pageSize: 10, total: 4, pageCount: 1 });
  });

  it('paginates', async () => {
    await seed();
    const response = await api().get('/api/applications?page=2&pageSize=3').expect(200);
    expect(companies(response)).toEqual(['Northwind Labs']);
    expect(response.body.meta).toEqual({ page: 2, pageSize: 3, total: 4, pageCount: 2 });
  });

  it('searches company and job title, ignoring case and accents', async () => {
    await seed();
    expect(companies(await api().get('/api/applications?q=NORTHWIND'))).toEqual(['Northwind Labs']);
    expect(companies(await api().get('/api/applications?q=zurich'))).toEqual(['Zürich Data']);
    expect(companies(await api().get('/api/applications?q=analyst'))).toEqual(['Zürich Data']);
    // Regex characters are treated literally.
    expect(companies(await api().get('/api/applications?q=.*'))).toEqual([]);
  });

  it('filters by status, location and applied-date range together', async () => {
    await seed();
    expect(companies(await api().get('/api/applications?status=interview'))).toEqual(['Northwind Labs']);
    expect(companies(await api().get('/api/applications?location=india'))).toEqual(['Sablewood Games', 'Northwind Labs']);
    expect(companies(await api().get('/api/applications?to=2026-09-30'))).toEqual(['Zürich Data', 'Northwind Labs']);
    expect(companies(await api().get('/api/applications?from=2026-09-15&location=remote'))).toEqual(['fernleaf studio']);
  });

  it('sorts company names case-insensitively and keeps empty dates last', async () => {
    await seed();
    expect(companies(await api().get('/api/applications?sort=company&order=asc'))).toEqual([
      'fernleaf studio',
      'Northwind Labs',
      'Sablewood Games',
      'Zürich Data',
    ]);
    const byDeadline = companies(await api().get('/api/applications?sort=deadline&order=asc'));
    expect(byDeadline.slice(0, 2)).toEqual(['fernleaf studio', 'Zürich Data']);
    const byAppliedDesc = companies(await api().get('/api/applications?sort=appliedDate&order=desc'));
    expect(byAppliedDesc.at(-1)).toBe('Sablewood Games');
  });

  it('sorts statuses in pipeline order', async () => {
    await seed();
    const response = await api().get('/api/applications?sort=status&order=asc');
    expect(response.body.data.map((item) => item.status)).toEqual(['saved', 'applied', 'applied', 'interview']);
  });

  it('rejects invalid query parameters with field errors', async () => {
    const response = await api().get('/api/applications?sort=salary&page=0&pageSize=500&from=2026-13-01').expect(400);
    expect(Object.keys(response.body.error.details.fieldErrors).sort()).toEqual(['from', 'page', 'pageSize', 'sort']);
  });
});

describe('GET /api/applications/stats', () => {
  it('counts by status and applications since a date', async () => {
    await createMany(api(), [
      { status: 'interview', appliedDate: '2026-09-10' },
      { status: 'offer', appliedDate: '2026-08-01' },
      { status: 'rejected', appliedDate: '2026-09-20' },
      { status: 'saved', appliedDate: '' },
    ]);

    const response = await api().get('/api/applications/stats?appliedSince=2026-09-01').expect(200);
    expect(response.body.data).toEqual({
      total: 4,
      byStatus: { saved: 1, applied: 0, assessment: 0, interview: 1, offer: 1, rejected: 1, withdrawn: 0 },
      interviews: 1,
      offers: 1,
      rejections: 1,
      appliedSince: { from: '2026-09-01', count: 2 },
    });
  });

  it('returns zeros for an empty account', async () => {
    const response = await api().get('/api/applications/stats').expect(200);
    expect(response.body.data).toMatchObject({ total: 0, interviews: 0, offers: 0, rejections: 0 });
    expect(response.body.data.appliedSince.count).toBe(0);
  });
});

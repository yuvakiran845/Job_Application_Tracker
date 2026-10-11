import { describe, expect, it } from 'vitest';
import { Activity } from '../src/models/Activity.js';
import { Application } from '../src/models/Application.js';
import { chooseGranularity, computeAnalytics, startOfWeek } from '../src/services/analyticsService.js';
import { escapeCsvValue, toCsv } from '../src/utils/csv.js';
import { OTHER_USER_ID, createMany, signUp, validApplication } from './helpers.js';

const BOM = String.fromCharCode(0xfeff);

/** Minimal RFC 4180 parser, to prove the export round-trips. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r' && text[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
    } else field += char;
  }
  return rows;
}

describe('activity timeline', () => {
  it('records creation, status changes and edited field names — never values', async () => {
    const { agent } = await signUp();
    const [created] = await createMany(agent, [{ status: 'applied', notes: 'private note' }]);

    await agent.put(`/api/applications/${created.id}`).send({ status: 'interview' }).expect(200);
    await agent
      .put(`/api/applications/${created.id}`)
      .send({ jobTitle: 'Senior Engineer', contact: { email: 'hr@example.com' }, notes: 'changed private note' })
      .expect(200);
    // Saving identical values records nothing.
    await agent.put(`/api/applications/${created.id}`).send({ jobTitle: 'Senior Engineer' }).expect(200);

    const response = await agent.get(`/api/applications/${created.id}/activity`).expect(200);
    const entries = response.body.data.map(({ type, fromStatus, toStatus, fields }) => ({ type, fromStatus, toStatus, fields }));
    expect(entries).toEqual([
      { type: 'updated', fromStatus: undefined, toStatus: undefined, fields: ['jobTitle', 'contact.email', 'notes'] },
      { type: 'status_changed', fromStatus: 'applied', toStatus: 'interview', fields: undefined },
      { type: 'created', fromStatus: undefined, toStatus: 'applied', fields: undefined },
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(/private note|hr@example\.com|Senior Engineer/);
  });

  it('is private to the owner and removed with the application', async () => {
    const { agent } = await signUp();
    const [created] = await createMany(agent, [{}]);
    const { agent: other } = await signUp();
    await other.get(`/api/applications/${created.id}/activity`).expect(404);

    await agent.delete(`/api/applications/${created.id}`).expect(204);
    expect(await Activity.countDocuments({ applicationId: created.id })).toBe(0);
  });

  it('starts empty for records created outside the app (no invented history)', async () => {
    const { agent, user } = await signUp();
    const legacy = await Application.create({ ...validApplication(), userId: user.id });
    const response = await agent.get(`/api/applications/${legacy._id}/activity`).expect(200);
    expect(response.body.data).toEqual([]);
  });
});

describe('CSV export', () => {
  it('escapes commas, quotes and newlines per RFC 4180', () => {
    expect(escapeCsvValue('plain')).toBe('plain');
    expect(escapeCsvValue('a, b')).toBe('"a, b"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue('line 1\nline 2')).toBe('"line 1\nline 2"');
    expect(escapeCsvValue(' padded ')).toBe('" padded "');
    expect(escapeCsvValue(null)).toBe('');
  });

  it('neutralises spreadsheet formulas (CSV injection)', () => {
    expect(escapeCsvValue('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(escapeCsvValue('+1 555')).toBe("'+1 555");
    expect(escapeCsvValue('-2')).toBe("'-2");
    expect(escapeCsvValue('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('starts with a byte-order mark and uses CRLF line endings', () => {
    expect(toCsv([{ a: 1 }], [{ header: 'A', value: (row) => row.a }])).toBe(`${BOM}A\r\n1\r\n`);
  });

  it("exports only the user's applications matching the filters, with tricky values intact", async () => {
    const { agent } = await signUp();
    await createMany(agent, [
      { company: 'Comma, Inc', notes: 'Line one\nLine "two"', status: 'interview' },
      { company: '=cmd|calc', status: 'applied' },
      { company: 'Saved Co', status: 'saved', appliedDate: '' },
    ]);
    const { agent: other } = await signUp();
    await createMany(other, [{ company: 'Someone Else' }]);

    const response = await agent.get('/api/applications/export?sort=company&order=asc').expect(200);
    expect(response.headers['content-type']).toMatch(/^text\/csv; charset=utf-8/);
    expect(response.headers['content-disposition']).toMatch(/^attachment; filename="careerflow-applications-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(response.headers['cache-control']).toBe('no-store');

    const [header, ...rows] = parseCsv(response.text.replace(BOM, ''));
    expect(header.slice(0, 4)).toEqual(['Company', 'Job title', 'Location', 'Status']);
    expect(rows.map((row) => row[0])).toEqual(["'=cmd|calc", 'Comma, Inc', 'Saved Co']);
    expect(rows[1][3]).toBe('Interview');
    expect(rows[1][header.indexOf('Notes')]).toBe('Line one\nLine "two"');
    expect(response.text).not.toContain('Someone Else');

    const filtered = await agent.get('/api/applications/export?status=interview').expect(200);
    expect(parseCsv(filtered.text.replace(BOM, ''))).toHaveLength(2); // header + 1
  });

  it('requires a session', async () => {
    const { api } = await import('./helpers.js');
    await api().get('/api/applications/export').expect(401);
  });
});

describe('analytics', () => {
  const record = (status, appliedDate, source = '') => ({ status, appliedDate, source });

  it('defines rates against submitted applications, by current status', () => {
    const result = computeAnalytics(
      [
        record('applied', '2026-09-01', 'linkedin'),
        record('assessment', '2026-09-03', 'linkedin'),
        record('interview', '2026-09-10', 'referral'),
        record('offer', '2026-09-12', 'referral'),
        record('rejected', '2026-09-20'),
        record('withdrawn', '2026-09-21', 'linkedin'),
        record('applied', '2026-09-28', 'linkedin'),
        record('applied', '2026-09-29', 'job-board'),
      ],
      { from: '2026-09-01', to: '2026-09-30' },
    );
    expect(result.totals).toEqual({ submitted: 8, responded: 4, reachedInterview: 2, offers: 1, rejections: 1, withdrawn: 1 });
    expect(result.rates).toEqual({ response: 0.5, interview: 0.25, offer: 0.125 });
    expect(result.bySource).toEqual([
      { source: 'linkedin', count: 4 },
      { source: 'referral', count: 2 },
      { source: '', count: 1 },
      { source: 'job-board', count: 1 },
    ]);
  });

  it('buckets by week (Mondays) and zero-fills gaps', () => {
    const result = computeAnalytics([record('applied', '2026-09-01'), record('applied', '2026-09-16')], {
      from: '2026-09-01',
      to: '2026-09-20',
    });
    expect(result.granularity).toBe('week');
    expect(result.overTime).toEqual([
      { start: '2026-08-31', count: 1 },
      { start: '2026-09-07', count: 0 },
      { start: '2026-09-14', count: 1 },
    ]);
  });

  it('chooses months and years for longer ranges', () => {
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05'); // Sunday → previous Monday
    expect(chooseGranularity('2026-01-01', '2026-03-31')).toBe('week');
    expect(chooseGranularity('2026-01-01', '2026-12-31')).toBe('month');
    expect(chooseGranularity('2016-01-01', '2026-12-31')).toBe('year');
  });

  it('returns null rates and no buckets when nothing was submitted', () => {
    const result = computeAnalytics([], {});
    expect(result.rates).toEqual({ response: null, interview: null, offer: null });
    expect(result.overTime).toEqual([]);
  });

  it("uses only the user's submitted applications within the range", async () => {
    const { agent } = await signUp();
    await createMany(agent, [
      { status: 'interview', appliedDate: '2026-09-10' },
      { status: 'applied', appliedDate: '2026-08-01' },
      { status: 'saved', appliedDate: '' },
    ]);
    await Application.create({ ...validApplication({ status: 'offer', appliedDate: '2026-09-11' }), userId: OTHER_USER_ID });

    const response = await agent.get('/api/applications/analytics?from=2026-09-01&to=2026-09-30').expect(200);
    expect(response.body.data.totals.submitted).toBe(1);
    expect(response.body.data.rates.interview).toBe(1);
    expect(response.body.data.range).toEqual({ from: '2026-09-01', to: '2026-09-30' });

    const allTime = await agent.get('/api/applications/analytics').expect(200);
    expect(allTime.body.data.totals.submitted).toBe(2);
    // "All time" spans the first to the last applied date (1 Aug – 10 Sep): weekly buckets.
    expect(allTime.body.data.granularity).toBe('week');
    expect(allTime.body.data.overTime.at(0)).toEqual({ start: '2026-07-27', count: 1 });
    expect(allTime.body.data.overTime.at(-1)).toEqual({ start: '2026-09-07', count: 1 });

    await agent.get('/api/applications/analytics?from=2026-10-01&to=2026-09-01').expect(400);
  });
});

describe('calendar events', () => {
  const range = {
    start: '2026-10-01',
    end: '2026-10-31',
    // India (UTC+5:30): local Oct 1 00:00 → Sep 30 18:30 UTC.
    startAt: '2026-09-30T18:30:00.000Z',
    endAt: '2026-10-31T18:29:59.999Z',
  };

  it("returns the user's interviews and deadlines inside the local range", async () => {
    const { agent } = await signUp();
    await createMany(agent, [
      { company: 'Inside', status: 'interview', interviewDate: '2026-09-30T19:00:00.000Z', deadline: '2026-10-31' },
      { company: 'Before', status: 'interview', interviewDate: '2026-09-30T18:00:00.000Z', deadline: '2026-09-30' },
      { company: 'NoDates' },
    ]);
    await Application.create({
      ...validApplication({ company: 'Foreign', deadline: '2026-10-10' }),
      userId: OTHER_USER_ID,
    });

    const response = await agent.get('/api/applications/events').query(range).expect(200);
    const events = response.body.data.map((event) => `${event.type}:${event.application.company}`).sort();
    expect(events).toEqual(['deadline:Inside', 'interview:Inside']);
    const interview = response.body.data.find((event) => event.type === 'interview');
    expect(interview).toMatchObject({ at: '2026-09-30T19:00:00.000Z', application: { status: 'interview' } });
  });

  it('validates the range', async () => {
    const { agent } = await signUp();
    const missing = await agent.get('/api/applications/events').expect(400);
    expect(Object.keys(missing.body.error.details.fieldErrors).sort()).toEqual(['end', 'endAt', 'start', 'startAt']);
    await agent.get('/api/applications/events').query({ ...range, end: '2026-09-01' }).expect(400);
    await agent.get('/api/applications/events').query({ ...range, end: '2028-01-01' }).expect(400);
  });
});

describe('saved views', () => {
  it('saves, lists and deletes views with a normalized query', async () => {
    const { agent } = await signUp();
    const created = await agent
      .post('/api/views')
      .send({ name: 'Interviews', query: 'status=interview&page=3&sort=createdAt&order=desc&q=+react+' })
      .expect(201);
    expect(created.body.data).toMatchObject({ name: 'Interviews', query: 'q=react&status=interview' });

    await agent.post('/api/views').send({ name: 'All', query: '' }).expect(201);
    const list = await agent.get('/api/views').expect(200);
    expect(list.body.data.map((view) => view.name)).toEqual(['All', 'Interviews']);

    await agent.delete(`/api/views/${created.body.data.id}`).expect(204);
    expect((await agent.get('/api/views')).body.data).toHaveLength(1);
  });

  it('rejects duplicate names (ignoring case) and invalid filters', async () => {
    const { agent } = await signUp();
    await agent.post('/api/views').send({ name: 'Offers', query: 'status=offer' }).expect(201);
    const duplicate = await agent.post('/api/views').send({ name: 'offers', query: '' }).expect(409);
    expect(duplicate.body.error.details.fieldErrors.name).toMatch(/already have a view/);
    const invalid = await agent.post('/api/views').send({ name: 'Bad', query: 'status=ghosted' }).expect(400);
    expect(invalid.body.error.details.fieldErrors.query).toBeDefined();
  });

  it('limits each user to 20 views and keeps them private', async () => {
    const { agent } = await signUp();
    for (let i = 0; i < 20; i += 1) await agent.post('/api/views').send({ name: `View ${i}`, query: '' }).expect(201);
    const over = await agent.post('/api/views').send({ name: 'One too many', query: '' }).expect(409);
    expect(over.body.error.code).toBe('VIEW_LIMIT');

    const { agent: other } = await signUp();
    expect((await other.get('/api/views')).body.data).toEqual([]);
    const id = (await agent.get('/api/views')).body.data[0].id;
    await other.delete(`/api/views/${id}`).expect(404);
  });
});

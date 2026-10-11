import { describe, expect, it, vi } from 'vitest';
import { api } from './helpers.js';

describe('health check', () => {
  it('reports ok when the database is connected', async () => {
    const response = await api().get('/api/health').expect(200);
    expect(response.body.data).toMatchObject({ status: 'ok', database: 'connected' });
    expect(response.body.data.uptimeSeconds).toEqual(expect.any(Number));
  });
});

describe('error responses', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const response = await api().get('/api/nope').expect(404);
    expect(response.body).toEqual({ error: { code: 'ROUTE_NOT_FOUND', message: 'No route for GET /api/nope.' } });
  });

  it('rejects malformed JSON', async () => {
    const response = await api()
      .post('/api/applications')
      .set('Content-Type', 'application/json')
      .send('{"company": ')
      .expect(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('rejects oversized bodies', async () => {
    const response = await api()
      .post('/api/applications')
      .send({ notes: 'x'.repeat(60 * 1024) })
      .expect(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('hides internal error details from clients', async () => {
    const { Application } = await import('../src/models/Application.js');
    vi.spyOn(Application, 'aggregate').mockImplementation(() => {
      throw new Error('secret connection detail');
    });
    const response = await api().get('/api/applications').expect(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' },
    });
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('does not advertise the framework', async () => {
    const response = await api().get('/api/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CORS', () => {
  const options = { corsOrigins: ['http://localhost:5173'] };

  it('allows the configured frontend origin with credentials', async () => {
    const response = await api(options).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('answers preflight requests for the allowed origin', async () => {
    const response = await api(options)
      .options('/api/applications')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PUT')
      .expect(204);
    expect(response.headers['access-control-allow-methods']).toContain('PUT');
  });

  it('gives no CORS headers to other origins', async () => {
    const response = await api(options).get('/api/health').set('Origin', 'https://evil.example');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('authentication placeholder', () => {
  it('rejects private routes when no development user is configured (production)', async () => {
    const response = await api({ devUserId: null }).get('/api/applications').expect(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('keeps the health check public', async () => {
    await api({ devUserId: null }).get('/api/health').expect(200);
  });
});

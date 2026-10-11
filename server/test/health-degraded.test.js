import { describe, expect, it, vi } from 'vitest';
import { api } from './helpers.js';

// Simulate a lost database connection without touching the real connection.
vi.mock('../src/config/database.js', () => ({ getDatabaseStatus: () => 'disconnected' }));

describe('health check without a database', () => {
  it('reports 503 so hosting platforms can detect the outage', async () => {
    const response = await api().get('/api/health').expect(503);
    expect(response.body.data).toMatchObject({ status: 'degraded', database: 'disconnected' });
  });
});

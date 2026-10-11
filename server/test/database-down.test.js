import mongoose from 'mongoose';
import { describe, expect, inject, it, vi } from 'vitest';
import { Application } from '../src/models/Application.js';
import { signUp } from './helpers.js';

describe('when the database is unavailable', () => {
  it('maps driver connection errors to 503 with Retry-After', async () => {
    const { agent } = await signUp();
    const error = Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:27017'), { name: 'MongoServerSelectionError' });
    vi.spyOn(Application, 'aggregate').mockImplementation(() => {
      throw error;
    });

    const response = await agent.get('/api/applications').expect(503);
    expect(response.headers['retry-after']).toBe('10');
    expect(response.body).toEqual({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'CareerFlow can’t reach its database right now. Please try again in a moment.',
      },
    });
    // Internal details (hosts, ports) never reach the client.
    expect(JSON.stringify(response.body)).not.toContain('10.0.0.5');
  });

  it('answers within seconds with 503 after the connection really drops', async () => {
    const { agent } = await signUp();
    const dbName = mongoose.connection.name;
    await mongoose.disconnect();

    const started = Date.now();
    try {
      const response = await agent.get('/api/applications');
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('DATABASE_UNAVAILABLE');
      expect(Date.now() - started).toBeLessThan(8_000);
    } finally {
      // Reconnect so the shared test hooks can clean up.
      await mongoose.connect(inject('mongoUri'), { dbName });
    }
  });
});

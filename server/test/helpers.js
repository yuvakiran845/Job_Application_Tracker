import request from 'supertest';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';

export const DEV_USER_ID = config.devUserId;
export const OTHER_USER_ID = '0000000000000000000000ff';

export function api(options) {
  return request(createApp(options));
}

export function validApplication(overrides = {}) {
  return {
    company: 'Northwind Labs',
    jobTitle: 'Frontend Engineer',
    location: 'Bengaluru, India',
    status: 'applied',
    appliedDate: '2026-09-29',
    ...overrides,
  };
}

/** Creates applications through the API and returns them in creation order. */
export async function createMany(agent, inputs) {
  const created = [];
  for (const input of inputs) {
    const response = await agent.post('/api/applications').send(validApplication(input)).expect(201);
    created.push(response.body.data);
  }
  return created;
}

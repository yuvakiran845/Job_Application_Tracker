import request from 'supertest';
import { createApp } from '../src/app.js';

export const OTHER_USER_ID = '0000000000000000000000ff';
export const CSRF_HEADER = { 'X-CSRF-Protection': '1' };
export const PASSWORD = 'correct horse battery';

let userCount = 0;

/** Stateless client (no cookies kept). */
export function api(options) {
  return request(createApp(options));
}

/** Cookie-keeping client that sends the CSRF header on every request, like the frontend. */
export function newAgent(app = createApp()) {
  return request.agent(app).set(CSRF_HEADER);
}

/** Registers a new account and returns a signed-in agent for it. */
export async function signUp({ name = 'Test User', email, password = PASSWORD, app } = {}) {
  userCount += 1;
  const agent = newAgent(app);
  const response = await agent
    .post('/api/auth/register')
    .send({ name, email: email ?? `user${userCount}@example.com`, password })
    .expect(201);
  return { agent, user: response.body.data, password };
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

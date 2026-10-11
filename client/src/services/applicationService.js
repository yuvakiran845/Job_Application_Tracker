/**
 * Application data service — the only module the UI uses to read or change applications.
 *
 * Level 1: backed by an in-memory store seeded with development-only sample data.
 * Changes live until the page is reloaded.
 *
 * Level 6: these functions will call the REST API instead. Components reach data only
 * through ApplicationsProvider → this module, so that swap will not touch the UI.
 */
import { buildSampleApplications } from '../data/sampleApplications';
import { createApplicationRecord } from '../utils/applicationModel';
import { validateApplicationInput } from '../utils/validation';
import { ValidationError } from './errors';

// Simulated network latency so loading and submitting states are exercised in development.
const MOCK_LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 350;

let store = null;

function getStore() {
  store ??= buildSampleApplications();
  return store;
}

function respond(data) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(data)), MOCK_LATENCY_MS);
  });
}

export async function listApplications() {
  return respond(getStore());
}

export async function createApplication(input) {
  const fieldErrors = validateApplicationInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    await respond(null);
    throw new ValidationError('Some fields need your attention.', fieldErrors);
  }

  const record = createApplicationRecord(input);
  store = [record, ...getStore()];
  return respond(record);
}

/** Development-only: restores the original sample data. Removed when the API is connected. */
export async function resetSampleData() {
  store = buildSampleApplications();
  return respond(null);
}

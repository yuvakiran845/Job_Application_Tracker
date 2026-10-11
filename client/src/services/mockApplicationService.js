/**
 * In-memory implementation of the application data service (VITE_DATA_SOURCE=mock,
 * the default). Seeded with development-only sample data; changes live until the
 * page is reloaded. Mirrors the REST API's behaviour and errors so the UI can be
 * developed and tested without a server. Used through services/applicationService.js.
 */
import { buildSampleApplications } from '../data/sampleApplications';
import { createApplicationRecord } from '../utils/applicationModel';
import { validateApplicationInput } from '../utils/validation';
import { NotFoundError, ValidationError } from './errors';

// Simulated network latency so loading and saving states are exercised in development.
const MOCK_LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 350;

let store = null;

function getStore() {
  store ??= buildSampleApplications();
  return store;
}

function simulateLatency() {
  return new Promise((resolve) => {
    setTimeout(resolve, MOCK_LATENCY_MS);
  });
}

function findOrThrow(id) {
  const application = getStore().find((item) => item.id === id);
  if (!application) throw new NotFoundError();
  return application;
}

function assertValid(input) {
  const fieldErrors = validateApplicationInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError('Some fields need your attention.', fieldErrors);
  }
}

export async function listApplications() {
  await simulateLatency();
  return structuredClone(getStore());
}

export async function createApplication(input) {
  await simulateLatency();
  assertValid(input);

  const record = createApplicationRecord(input);
  store = [record, ...getStore()];
  return structuredClone(record);
}

/**
 * Applies `changes` (any subset of fields) to an application and validates the
 * result as a whole, so partial updates can't leave a record in an invalid state.
 */
export async function updateApplication(id, changes) {
  await simulateLatency();
  const current = findOrThrow(id);
  const merged = { ...current, ...changes, contact: { ...current.contact, ...changes.contact } };
  assertValid(merged);

  const updated = { ...createApplicationRecord(merged, { id }), createdAt: current.createdAt };
  store = getStore().map((item) => (item.id === id ? updated : item));
  return structuredClone(updated);
}

export async function deleteApplication(id) {
  await simulateLatency();
  findOrThrow(id);
  store = getStore().filter((item) => item.id !== id);
}

/** Development-only: restores the original sample data. Removed when the API is connected. */
export async function resetSampleData() {
  await simulateLatency();
  store = buildSampleApplications();
}

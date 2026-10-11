/**
 * Application data service — the only module the UI uses to read or change applications.
 * Delegates to the REST API or to the in-memory mock, depending on VITE_DATA_SOURCE
 * (see src/config.js). Both implementations share signatures and error types.
 */
import { DATA_SOURCE } from '../config';
import * as api from './apiApplicationService';
import * as mock from './mockApplicationService';

const source = DATA_SOURCE === 'api' ? api : mock;

export const listApplications = () => source.listApplications();
export const createApplication = (input) => source.createApplication(input);
export const updateApplication = (id, changes) => source.updateApplication(id, changes);
export const deleteApplication = (id) => source.deleteApplication(id);

/** Development-only: restores the mock's sample data. Not available with the real API. */
export async function resetSampleData() {
  if (DATA_SOURCE === 'api') throw new Error('Sample data can only be reset in mock mode.');
  return mock.resetSampleData();
}

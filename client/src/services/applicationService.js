/**
 * Application data service — the only module the UI uses to read or change applications.
 * Delegates to the REST API (default) or the development sample-data service.
 * Both share signatures, response shapes and error types.
 */
import * as api from './apiApplicationService';

// Same rule as IS_MOCK_DATA in src/config.js, written inline so it is statically false
// in production builds: the sample-data module is then not even included in the bundle.
const useSampleData = !import.meta.env.PROD && import.meta.env.VITE_DATA_SOURCE === 'mock';
const source = useSampleData ? await import('./mockApplicationService') : api;

export const listApplications = (query) => source.listApplications(query);
export const getApplication = (id) => source.getApplication(id);
export const getApplicationStats = (options) => source.getApplicationStats(options);
export const createApplication = (input) => source.createApplication(input);
export const updateApplication = (id, changes) => source.updateApplication(id, changes);
export const deleteApplication = (id) => source.deleteApplication(id);

/** Development-only: restores the sample data. Not available with the real API. */
export async function resetSampleData() {
  if (!useSampleData) throw new Error('Sample data can only be reset in sample-data mode.');
  return source.resetSampleData();
}

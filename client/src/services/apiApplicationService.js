import { apiRequest } from './apiClient';

// REST API implementation of the application data service. Same function
// signatures, response shapes and error types as mockApplicationService.js.

const path = (id) => `/applications/${encodeURIComponent(id)}`;

/** Server-side search, filters, sorting and pagination. Returns `{ items, meta }`. */
export async function listApplications(query = {}) {
  const { data, meta } = await apiRequest('/applications', { query });
  return { items: data, meta };
}

export async function getApplication(id) {
  const { data } = await apiRequest(path(id));
  return data;
}

export async function getApplicationStats({ appliedSince }) {
  const { data } = await apiRequest('/applications/stats', { query: { appliedSince } });
  return data;
}

export async function createApplication(input) {
  const { data } = await apiRequest('/applications', { method: 'POST', body: input });
  return data;
}

export async function updateApplication(id, changes) {
  const { data } = await apiRequest(path(id), { method: 'PUT', body: changes });
  return data;
}

export async function deleteApplication(id) {
  await apiRequest(path(id), { method: 'DELETE' });
}

import { apiRequest } from './apiClient';

// REST API implementation of the application data service. Same function
// signatures and error types as mockApplicationService.js.

const PAGE_SIZE = 100;

/**
 * Interim (Level 4): loads every page so the existing client-side search, filters
 * and dashboard stats keep working unchanged. Level 6 moves those to the server
 * (GET /applications query params and GET /applications/stats).
 */
export async function listApplications() {
  const items = [];
  for (let page = 1; ; page += 1) {
    const { data, meta } = await apiRequest('/applications', { query: { page, pageSize: PAGE_SIZE } });
    items.push(...data);
    if (page >= meta.pageCount || data.length === 0) return items;
  }
}

export async function createApplication(input) {
  const { data } = await apiRequest('/applications', { method: 'POST', body: input });
  return data;
}

export async function updateApplication(id, changes) {
  const { data } = await apiRequest(`/applications/${encodeURIComponent(id)}`, { method: 'PUT', body: changes });
  return data;
}

export async function deleteApplication(id) {
  await apiRequest(`/applications/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

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

/** CSV of every application matching the list filters (no paging). Returns `{ blob, filename }`. */
export async function exportApplications(query = {}) {
  const { page: _page, pageSize: _pageSize, ...filters } = query;
  return apiRequest('/applications/export', { query: filters, responseType: 'file' });
}

export async function getAnalytics({ from, to }) {
  const { data } = await apiRequest('/applications/analytics', { query: { from, to } });
  return data;
}

/** Interviews and deadlines in a local date range (see utils/calendar.js for the range shape). */
export async function listEvents(range) {
  const { data } = await apiRequest('/applications/events', { query: range });
  return data;
}

export async function listActivity(id) {
  const { data } = await apiRequest(`${path(id)}/activity`);
  return data;
}

export async function listViews() {
  const { data } = await apiRequest('/views');
  return data;
}

export async function createView({ name, query }) {
  const { data } = await apiRequest('/views', { method: 'POST', body: { name, query } });
  return data;
}

export async function deleteView(id) {
  await apiRequest(`/views/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

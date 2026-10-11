import { afterEach, describe, expect, it, vi } from 'vitest';
import { listApplications, updateApplication } from './apiApplicationService';
import { apiRequest } from './apiClient';
import { ApiError, NotFoundError, ValidationError } from './errors';

function jsonResponse(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockFetch(...responses) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('sends JSON with credentials and skips empty query params', async () => {
    const fetchMock = mockFetch(jsonResponse(201, { data: { id: '1' } }));
    const result = await apiRequest('/applications', {
      method: 'POST',
      body: { company: 'Acme' },
      query: { q: 'react', status: '', page: 2 },
    });

    expect(result).toEqual({ data: { id: '1' } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe('/api/applications');
    expect(url.search).toBe('?q=react&page=2');
    expect(init).toMatchObject({ method: 'POST', credentials: 'include', body: '{"company":"Acme"}' });
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('returns null for 204 No Content', async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(apiRequest('/applications/1', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('turns validation errors into ValidationError with field errors', async () => {
    mockFetch(
      jsonResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Some fields need your attention.',
          details: { fieldErrors: { 'contact.email': 'Enter a valid email address.' } },
        },
      }),
    );
    const error = await apiRequest('/applications').catch((caught) => caught);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.fieldErrors).toEqual({ 'contact.email': 'Enter a valid email address.' });
  });

  it('treats 404 and malformed IDs as NotFoundError', async () => {
    mockFetch(
      jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'Application not found.' } }),
      jsonResponse(400, { error: { code: 'INVALID_ID', message: 'Invalid application ID.' } }),
    );
    await expect(apiRequest('/applications/x')).rejects.toBeInstanceOf(NotFoundError);
    await expect(apiRequest('/applications/y')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('passes through the server message for other errors', async () => {
    mockFetch(jsonResponse(401, { error: { code: 'AUTH_REQUIRED', message: 'You need to sign in to do that.' } }));
    const error = await apiRequest('/applications').catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: 'AUTH_REQUIRED', message: 'You need to sign in to do that.' });
  });

  it('handles responses without a JSON body', async () => {
    mockFetch(new Response('Internal error', { status: 500 }));
    const error = await apiRequest('/applications').catch((caught) => caught);
    expect(error).toMatchObject({ name: 'ApiError', status: 500, message: 'The request failed (500). Please try again.' });
  });

  it('explains gateway errors from proxies when the API is down', async () => {
    mockFetch(new Response('Bad gateway', { status: 502 }));
    const error = await apiRequest('/applications').catch((caught) => caught);
    expect(error).toMatchObject({ status: 502, code: 'SERVER_UNAVAILABLE' });
    expect(error.message).toMatch(/unavailable right now/);
  });

  it('reports network failures clearly', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    const error = await apiRequest('/applications').catch((caught) => caught);
    expect(error).toMatchObject({ name: 'ApiError', code: 'NETWORK_ERROR' });
    expect(error.message).toMatch(/Can’t reach the CareerFlow server/);
  });
});

describe('apiApplicationService', () => {
  it('loads every page of applications', async () => {
    const fetchMock = mockFetch(
      jsonResponse(200, { data: [{ id: 'a' }, { id: 'b' }], meta: { page: 1, pageSize: 100, total: 3, pageCount: 2 } }),
      jsonResponse(200, { data: [{ id: 'c' }], meta: { page: 2, pageSize: 100, total: 3, pageCount: 2 } }),
    );
    const items = await listApplications();
    expect(items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(fetchMock.mock.calls.map(([url]) => url.searchParams.get('page'))).toEqual(['1', '2']);
  });

  it('sends partial updates with PUT to an encoded URL', async () => {
    const fetchMock = mockFetch(jsonResponse(200, { data: { id: 'a/b', status: 'offer' } }));
    await expect(updateApplication('a/b', { status: 'offer' })).resolves.toEqual({ id: 'a/b', status: 'offer' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe('/api/applications/a%2Fb');
    expect(init.method).toBe('PUT');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApplicationStats, listApplications, updateApplication } from './apiApplicationService';
import { SESSION_EXPIRED_EVENT, apiRequest } from './apiClient';
import { getCurrentUser } from './authService';
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
    expect(error.message).toMatch(/Can’t reach the My Job Trackr server/);
  });
});

describe('apiApplicationService', () => {
  it('passes search, filters, sorting and paging to the server and returns { items, meta }', async () => {
    const meta = { page: 2, pageSize: 10, total: 13, pageCount: 2 };
    const fetchMock = mockFetch(jsonResponse(200, { data: [{ id: 'k' }], meta }));
    const result = await listApplications({ q: 'react', status: 'interview', location: '', sort: 'company', order: 'asc', page: 2, pageSize: 10 });

    expect(result).toEqual({ items: [{ id: 'k' }], meta });
    const [url] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe('/api/applications');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'react',
      status: 'interview',
      sort: 'company',
      order: 'asc',
      page: '2',
      pageSize: '10',
    });
  });

  it('asks for stats from the user’s local window start', async () => {
    const fetchMock = mockFetch(jsonResponse(200, { data: { total: 3 } }));
    await expect(getApplicationStats({ appliedSince: '2026-09-12' })).resolves.toEqual({ total: 3 });
    expect(fetchMock.mock.calls[0][0].search).toBe('?appliedSince=2026-09-12');
  });

  it('sends partial updates with PUT to an encoded URL', async () => {
    const fetchMock = mockFetch(jsonResponse(200, { data: { id: 'a/b', status: 'offer' } }));
    await expect(updateApplication('a/b', { status: 'offer' })).resolves.toEqual({ id: 'a/b', status: 'offer' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe('/api/applications/a%2Fb');
    expect(init.method).toBe('PUT');
  });
});

describe('authentication and CSRF', () => {
  it('adds the CSRF header to writes but not to reads', async () => {
    const fetchMock = mockFetch(jsonResponse(200, { data: [] }), jsonResponse(201, { data: {} }));
    await apiRequest('/applications');
    await apiRequest('/applications', { method: 'POST', body: {} });
    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-Protection']).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].headers['X-CSRF-Protection']).toBe('1');
  });

  it('announces an ended session when a signed-in request gets 401', async () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    mockFetch(
      jsonResponse(401, { error: { code: 'AUTH_REQUIRED', message: 'You need to sign in to do that.' } }),
      jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } }),
    );

    await expect(apiRequest('/applications')).rejects.toMatchObject({ status: 401, code: 'AUTH_REQUIRED' });
    expect(listener).toHaveBeenCalledOnce();
    // A failed sign-in is not an expired session.
    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it('maps field errors on any status (e.g. 409 email taken) to ValidationError', async () => {
    mockFetch(
      jsonResponse(409, {
        error: {
          code: 'EMAIL_TAKEN',
          message: 'An account with this email already exists.',
          details: { fieldErrors: { email: 'An account with this email already exists.' } },
        },
      }),
    );
    const error = await apiRequest('/auth/register', { method: 'POST', body: {} }).catch((caught) => caught);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.fieldErrors.email).toMatch(/already exists/);
  });

  it('treats "not signed in" as no current user rather than an error', async () => {
    mockFetch(
      jsonResponse(401, { error: { code: 'AUTH_REQUIRED', message: 'You need to sign in to do that.' } }),
      jsonResponse(200, { data: { id: 'u1', name: 'Priya', email: 'priya@example.com' } }),
    );
    await expect(getCurrentUser()).resolves.toBeNull();
    await expect(getCurrentUser()).resolves.toMatchObject({ id: 'u1' });
  });
});

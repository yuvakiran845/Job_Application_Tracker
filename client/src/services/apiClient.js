import { API_BASE_URL } from '../config';
import { ApiError, NotFoundError, ValidationError } from './errors';

const TIMEOUT_MS = 15_000;
const GATEWAY_ERRORS = [502, 503, 504];

/**
 * The single place the frontend talks HTTP. Sends and parses JSON, includes
 * credentials (for the session cookie added in Level 5), applies a timeout, and
 * converts the API's `{ error: { code, message, details } }` responses into the
 * data-layer error classes.
 */
export async function apiRequest(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted
        ? 'The server took too long to respond. Please try again.'
        : 'Can’t reach the CareerFlow server. Check your connection and try again.',
      { code: 'NETWORK_ERROR' },
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (response.ok) return payload;

  const error = payload?.error ?? {};
  if (error.code === 'VALIDATION_ERROR') {
    throw new ValidationError(error.message || 'Some fields need your attention.', error.details?.fieldErrors ?? {});
  }
  if (response.status === 404 || error.code === 'INVALID_ID') throw new NotFoundError();
  // Proxies and hosting platforms answer 502–504 themselves when the API is down.
  if (GATEWAY_ERRORS.includes(response.status) && !error.code) {
    throw new ApiError('The CareerFlow server is unavailable right now. Please try again in a moment.', {
      status: response.status,
      code: 'SERVER_UNAVAILABLE',
    });
  }
  throw new ApiError(error.message || `The request failed (${response.status}). Please try again.`, {
    status: response.status,
    code: error.code,
  });
}

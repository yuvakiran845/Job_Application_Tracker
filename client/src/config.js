// Build-time configuration from Vite environment variables (see client/.env.example).

/**
 * Where application data comes from:
 * - "api" (default): the CareerFlow REST API, with sign-in.
 * - "mock": in-memory development sample data, no server or sign-in. Opt-in for
 *   frontend-only development (VITE_DATA_SOURCE=mock) and used by the test suite.
 *   Production builds always use the API, so sample data can never be shown as
 *   someone's real data.
 */
export const DATA_SOURCE =
  !import.meta.env.PROD && import.meta.env.VITE_DATA_SOURCE === 'mock' ? 'mock' : 'api';
export const IS_MOCK_DATA = DATA_SOURCE === 'mock';

/** API base URL. "/api" works in development through the Vite proxy. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

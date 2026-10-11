// Build-time configuration from Vite environment variables (see client/.env.example).

/**
 * Where application data comes from:
 * - "mock" (default): in-memory development sample data, no server needed.
 * - "api": the CareerFlow REST API (start the server in /server first).
 */
export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock';
export const IS_MOCK_DATA = DATA_SOURCE === 'mock';

/** API base URL. "/api" works in development through the Vite proxy. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

import { apiRequest } from './apiClient';

// Account and session calls. The session itself is an HttpOnly cookie managed by
// the browser and the API — the frontend never sees or stores a token.

/** The signed-in user, or null when there is no valid session. */
export async function getCurrentUser() {
  try {
    const { data } = await apiRequest('/auth/me');
    return data;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

export async function login({ email, password }) {
  const { data } = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
  return data;
}

export async function register({ name, email, password }) {
  const { data } = await apiRequest('/auth/register', { method: 'POST', body: { name, email, password } });
  return data;
}

export async function logout() {
  await apiRequest('/auth/logout', { method: 'POST' });
}

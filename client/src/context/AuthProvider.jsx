import { useCallback, useEffect, useMemo, useState } from 'react';
import { IS_MOCK_DATA } from '../config';
import { SESSION_EXPIRED_EVENT } from '../services/apiClient';
import * as defaultAuthService from '../services/authService';
import { AuthContext } from './authContext';

// With sample data there is no server to sign in to, so a clearly labelled guest is used.
const GUEST = { id: 'guest', name: 'Guest', email: '' };

/**
 * Holds the signed-in user. On start it asks the API who is signed in (the session
 * is an HttpOnly cookie, so this is the only way to know). Listens for expired
 * sessions reported by the API client.
 *
 * `service` and `enabled` are injectable for tests.
 */
export function AuthProvider({ children, service = defaultAuthService, enabled = !IS_MOCK_DATA }) {
  const [state, setState] = useState(() =>
    enabled ? { status: 'loading', user: null } : { status: 'authenticated', user: GUEST },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let ignore = false;
    service.getCurrentUser().then(
      (user) => {
        if (!ignore) setState(user ? { status: 'authenticated', user } : { status: 'unauthenticated', user: null });
      },
      (error) => {
        if (!ignore) setState({ status: 'error', user: null, error });
      },
    );
    return () => {
      ignore = true;
    };
  }, [enabled, service, attempt]);

  useEffect(() => {
    if (!enabled) return undefined;
    const handleExpired = () =>
      setState((current) =>
        current.status === 'authenticated' ? { status: 'unauthenticated', user: null, reason: 'expired' } : current,
      );
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [enabled]);

  const retry = useCallback(() => {
    setState({ status: 'loading', user: null });
    setAttempt((count) => count + 1);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const user = await service.login(credentials);
      setState({ status: 'authenticated', user });
      return user;
    },
    [service],
  );

  const register = useCallback(
    async (details) => {
      const user = await service.register(details);
      setState({ status: 'authenticated', user });
      return user;
    },
    [service],
  );

  /** Ends the session on the server first; if that fails the user stays signed in. */
  const logout = useCallback(async () => {
    await service.logout();
    setState({ status: 'unauthenticated', user: null, reason: 'signed-out' });
  }, [service]);

  const value = useMemo(
    () => ({ ...state, enabled, login, register, logout, retry }),
    [state, enabled, login, register, logout, retry],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

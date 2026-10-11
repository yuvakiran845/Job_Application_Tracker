import { useContext } from 'react';
import { AuthContext } from '../context/authContext';

/**
 * `{ status, user, reason, enabled, login, register, logout, retry }`.
 * status: "loading" | "authenticated" | "unauthenticated" | "error".
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

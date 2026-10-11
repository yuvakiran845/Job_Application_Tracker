import { serializeUser } from '../models/User.js';
import * as authService from '../services/authService.js';
import { clearSessionCookie, setSessionCookie } from '../utils/session.js';

export async function register(req, res) {
  const { user, data } = await authService.registerUser(req.validated.body);
  await setSessionCookie(res, user);
  res.status(201).json({ data });
}

export async function login(req, res) {
  const { user, data } = await authService.authenticate(req.validated.body);
  await setSessionCookie(res, user);
  res.json({ data });
}

export function logout(_req, res) {
  clearSessionCookie(res);
  res.status(204).end();
}

export function me(req, res) {
  res.json({ data: serializeUser(req.userDocument) });
}

export async function updateProfile(req, res) {
  res.json({ data: await authService.updateProfile(req.user.id, req.validated.body) });
}

export async function changePassword(req, res) {
  const user = await authService.changePassword(req.user.id, req.validated.body);
  // Other sessions are now invalid; keep this one signed in with a fresh token.
  await setSessionCookie(res, user);
  res.status(204).end();
}

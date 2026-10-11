import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config/env.js';

// Session = a signed JWT in an HttpOnly cookie. JavaScript in the browser can't
// read it (protects against token theft via XSS), and it is only sent to /api.

export const SESSION_COOKIE = 'cf_session';
const ISSUER = 'careerflow-api';
const AUDIENCE = 'careerflow-web';
const ALGORITHM = 'HS256';

function secretKey() {
  return new TextEncoder().encode(config.auth.jwtSecret);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: config.auth.cookieSameSite,
    path: '/api',
  };
}

export async function createSessionToken(user) {
  return new SignJWT({ ver: user.tokenVersion ?? 0 })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(String(user._id))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${config.auth.sessionDays}d`)
    .sign(secretKey());
}

/** Returns `{ userId, version }` for a valid token, or null for anything else. */
export async function readSessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [ALGORITHM],
    });
    if (typeof payload.sub !== 'string' || !Number.isInteger(payload.ver)) return null;
    return { userId: payload.sub, version: payload.ver };
  } catch {
    // Expired, tampered with, wrong signature or malformed.
    return null;
  }
}

export async function setSessionCookie(res, user) {
  const token = await createSessionToken(user);
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: config.auth.sessionDays * 24 * 60 * 60 * 1000 });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

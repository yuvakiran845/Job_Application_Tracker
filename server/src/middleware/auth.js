import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { SESSION_COOKIE, clearSessionCookie, readSessionToken } from '../utils/session.js';

/**
 * Requires a valid session. Identity comes only from the signed session cookie,
 * never from the request body or URL. The user is reloaded on each request so
 * deleted accounts and revoked sessions (tokenVersion changed) stop working at once.
 * Sets `req.user = { id, name, email }`.
 */
export async function requireAuth(req, res, next) {
  const session = await readSessionToken(req.cookies?.[SESSION_COOKIE]);
  const user = session && (await User.findById(session.userId).select('+tokenVersion'));

  if (!user || user.tokenVersion !== session.version) {
    // Remove a cookie that can no longer be used so the browser stops sending it.
    if (req.cookies?.[SESSION_COOKIE]) clearSessionCookie(res);
    return next(new AppError(401, 'AUTH_REQUIRED', 'You need to sign in to do that.'));
  }

  req.user = { id: String(user._id), name: user.name, email: user.email };
  req.userDocument = user;
  return next();
}

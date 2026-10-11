import { AppError } from '../utils/errors.js';

/**
 * TEMPORARY placeholder until real authentication is added in Level 5.
 *
 * - Development/test: every request acts as one fixed development user, so all
 *   data access is already scoped by owner (userId) from the start.
 * - Production: `devUserId` is null and every private request is rejected,
 *   so no data can be exposed before authentication exists.
 *
 * Level 5 replaces this with verification of the session token; route handlers
 * keep reading the owner from `req.user.id` and never from the request body.
 */
export function createRequireAuth({ devUserId }) {
  return function requireAuth(req, _res, next) {
    if (!devUserId) {
      return next(new AppError(401, 'AUTH_REQUIRED', 'You need to sign in to do that.'));
    }
    req.user = { id: devUserId };
    return next();
  };
}

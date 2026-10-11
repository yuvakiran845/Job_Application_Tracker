import { AppError } from '../utils/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-csrf-protection';

/**
 * Cross-site request forgery protection for cookie-based sessions, layered on
 * top of SameSite cookies:
 *
 * 1. Every state-changing request must carry the custom header
 *    `X-CSRF-Protection: 1`. Browsers only let another origin send a custom
 *    header after a CORS preflight, and preflights succeed only for the
 *    configured frontend origins — so forged forms and cross-site fetches fail.
 * 2. If the browser sends an Origin header, it must be an allowed origin or
 *    this API's own origin.
 *
 * Non-browser clients (curl, tests) don't send Origin and aren't a CSRF vector.
 */
export function createCsrfProtection({ allowedOrigins }) {
  return function csrfProtection(req, _res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    if (req.get(CSRF_HEADER) !== '1') {
      return next(new AppError(403, 'CSRF_REJECTED', 'This request was blocked for your security. Please reload and try again.'));
    }

    const origin = req.get('origin');
    const ownOrigin = `${req.protocol}://${req.get('host')}`;
    if (origin && origin !== ownOrigin && !allowedOrigins.includes(origin)) {
      return next(new AppError(403, 'CSRF_REJECTED', 'This request was blocked for your security. Please reload and try again.'));
    }

    return next();
  };
}

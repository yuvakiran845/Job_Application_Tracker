import { rateLimit } from 'express-rate-limit';

function buildLimiter(options) {
  return rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes and try again.' },
      });
    },
    ...options,
  });
}

/**
 * Per-IP limits for authentication endpoints:
 * - `login` (sign-in, password changes): counts only failed attempts, so password
 *   guessing is slowed while people who sign in and out normally are never blocked.
 * - `signup`: counts every attempt, to limit automated account creation.
 *
 * In-memory stores are correct for a single server instance; use a shared store
 * (e.g. Redis) if you run several. Behind a proxy, set TRUST_PROXY so the real
 * client IP is used.
 */
export function createAuthRateLimiters({ login = {}, signup = {} } = {}) {
  return {
    login: buildLimiter({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, ...login }),
    signup: buildLimiter({ windowMs: 60 * 60 * 1000, limit: 10, ...signup }),
  };
}

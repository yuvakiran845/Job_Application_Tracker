import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/env.js';
import { health } from './controllers/healthController.js';
import { createCsrfProtection } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createAuthRateLimiters } from './middleware/rateLimit.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createApplicationRouter } from './routes/applicationRoutes.js';
import { createAuthRouter, createUserRouter } from './routes/authRoutes.js';
import { createViewRouter } from './routes/viewRoutes.js';

/**
 * Builds the Express app without connecting to the database or listening on a
 * port, so tests can exercise it directly. Options override config for tests.
 */
export function createApp({
  corsOrigins = config.corsOrigins,
  authRateLimit = {
    login: { limit: config.auth.loginRateLimit },
    signup: { limit: config.auth.signupRateLimit },
  },
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Needed behind a hosting proxy so req.ip (rate limiting) and req.protocol are correct.
  app.set('trust proxy', config.trustProxy);

  app.use(requestLogger);
  app.use(
    helmet({
      // Allow the frontend on a sibling subdomain (same site) to read responses.
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(
    cors({
      // Only the configured frontend origins get CORS headers; browsers block the rest.
      // Requests without an Origin header (curl, server-to-server) don't need CORS.
      origin: (origin, callback) => callback(null, !origin || corsOrigins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(createCsrfProtection({ allowedOrigins: corsOrigins }));
  app.use(cookieParser());
  app.use(express.json({ limit: '50kb' }));

  const rateLimiters = createAuthRateLimiters(authRateLimit);
  const api = express.Router();
  api.get('/health', health);
  api.use('/auth', createAuthRouter(rateLimiters));
  api.use('/users', createUserRouter(rateLimiters));
  api.use('/applications', createApplicationRouter());
  api.use('/views', createViewRouter());
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

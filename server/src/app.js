import cors from 'cors';
import express from 'express';
import { config } from './config/env.js';
import { health } from './controllers/healthController.js';
import { createRequireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createApplicationRouter } from './routes/applicationRoutes.js';

/**
 * Builds the Express app without connecting to the database or listening on a
 * port, so tests can exercise it directly. Options override config for tests.
 */
export function createApp({ corsOrigins = config.corsOrigins, devUserId = config.devUserId } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(requestLogger);
  app.use(
    cors({
      // Only the configured frontend origins get CORS headers; browsers block the rest.
      // Requests without an Origin header (curl, server-to-server) don't need CORS.
      origin: (origin, callback) => callback(null, !origin || corsOrigins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '50kb' }));

  const api = express.Router();
  api.get('/health', health);
  api.use('/applications', createApplicationRouter({ requireAuth: createRequireAuth({ devUserId }) }));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

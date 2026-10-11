import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

async function start() {
  await connectDatabase(config.mongodbUri);

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`CareerFlow API listening on port ${config.port}`, { env: config.env });
    if (config.devUserId) {
      logger.warn('Authentication is not implemented yet: all requests act as the development user.');
    }
  });

  async function shutdown(signal) {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Force exit if open connections keep the server from closing.
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  logger.error('Failed to start server', { name: error.name, message: error.message });
  process.exit(1);
});

/**
 * Development seed: `npm run seed` (add `-- --reset` to replace existing sample data).
 * Separate from normal startup on purpose — the server never seeds itself.
 */
import { config } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';
import { seedApplications } from './seedData.js';

if (config.isProduction || !config.devUserId) {
  logger.error('Refusing to seed: sample data is for development only (NODE_ENV is production).');
  process.exit(1);
}

const reset = process.argv.includes('--reset');

try {
  await connectDatabase(config.mongodbUri);
  const count = await seedApplications({ userId: config.devUserId, reset });
  logger.info(`Seeded ${count} sample applications for the development user.`);
} catch (error) {
  logger.error(`Seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}

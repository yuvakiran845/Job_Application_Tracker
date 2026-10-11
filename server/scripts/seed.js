/**
 * Development seed: adds the sample applications to an existing account.
 *
 *   npm run seed -- --email you@example.com            (register in the app first)
 *   npm run seed -- --email you@example.com --reset    (replace that account's applications)
 *
 * Separate from normal startup on purpose — the server never seeds itself — and it
 * never creates user accounts.
 */
import { config } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { logger } from '../src/utils/logger.js';
import { seedApplications } from './seedData.js';

if (config.isProduction) {
  logger.error('Refusing to seed: sample data is for development only (NODE_ENV is production).');
  process.exit(1);
}

const emailFlag = process.argv.indexOf('--email');
const email = emailFlag === -1 ? '' : (process.argv[emailFlag + 1] ?? '').trim().toLowerCase();
if (!email) {
  logger.error('Usage: npm run seed -- --email you@example.com [--reset]');
  process.exit(1);
}
const reset = process.argv.includes('--reset');

try {
  await connectDatabase(config.mongodbUri);
  const user = await User.findOne({ email });
  if (!user) throw new Error('No account uses that email. Create one in the app first, then run the seed again.');
  const count = await seedApplications({ userId: user._id, reset });
  logger.info(`Seeded ${count} sample applications for that account.`);
} catch (error) {
  logger.error(`Seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}

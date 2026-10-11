import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];
let closing = false;

// Reject query filters on fields that aren't in the schema instead of silently ignoring them.
mongoose.set('strictQuery', true);
// If the connection drops, fail queries after 5 s (answered as 503) instead of
// leaving requests hanging for Mongoose's 10 s default.
mongoose.set('bufferTimeoutMS', 5_000);

/**
 * Connects to MongoDB (local or Atlas). The URI is never logged because it may
 * contain credentials; only the database name and host are.
 */
export async function connectDatabase(uri) {
  mongoose.connection.on('disconnected', () => {
    if (closing) logger.info('MongoDB connection closed');
    else logger.warn('MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (error) => logger.error('MongoDB connection error', { name: error.name }));

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5_000,
    // Shown in Atlas monitoring and server logs, which makes connections easy to identify.
    appName: 'careerflow-api',
  });

  const { name, host } = mongoose.connection;
  logger.info('MongoDB connected', { database: name, host });
  if (name === 'test') {
    // A URI without a database path silently uses "test" (common with Atlas strings).
    logger.warn('Connected to the default "test" database. Add a name to MONGODB_URI, e.g. …mongodb.net/careerflow?…');
  }
}

export async function disconnectDatabase() {
  closing = true;
  await mongoose.disconnect();
}

export function getDatabaseStatus() {
  return STATES[mongoose.connection.readyState] ?? 'unknown';
}

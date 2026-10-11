import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

// Reject query filters on fields that aren't in the schema instead of silently ignoring them.
mongoose.set('strictQuery', true);

/** Connects to MongoDB. The URI is never logged because it may contain credentials. */
export async function connectDatabase(uri) {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (error) => logger.error('MongoDB connection error', { name: error.name }));

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const { name, host } = mongoose.connection;
  logger.info('MongoDB connected', { database: name, host });
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export function getDatabaseStatus() {
  return STATES[mongoose.connection.readyState] ?? 'unknown';
}

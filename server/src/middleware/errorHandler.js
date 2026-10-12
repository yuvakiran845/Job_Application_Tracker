import mongoose from 'mongoose';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

function sendError(res, status, code, message, details) {
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}

// Driver and Mongoose errors that mean the database can't be reached right now.
const DATABASE_UNAVAILABLE = new Set([
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
]);

function isDatabaseUnavailable(error) {
  return (
    DATABASE_UNAVAILABLE.has(error?.name) ||
    // Mongoose queues commands while disconnected and gives up after bufferTimeoutMS.
    (error?.name === 'MongooseError' && /buffering timed out/.test(error.message))
  );
}

export function notFoundHandler(req, res) {
  sendError(res, 404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}.`);
}

/**
 * Central error handler. Every error response has the shape
 * `{ error: { code, message, details? } }`. Unexpected errors are logged with
 * their stack trace server-side; clients only ever get a generic message.
 */
// Express identifies error handlers by their four parameters.
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    return sendError(res, error.status, error.code, error.message, error.details);
  }

  // Thrown by express.json() for malformed or oversized bodies.
  if (error.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_JSON', 'Request body is not valid JSON.');
  }
  if (error.type === 'entity.too.large') {
    return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const fieldErrors = Object.fromEntries(
      Object.entries(error.errors).map(([path, fieldError]) => [path, fieldError.message]),
    );
    return sendError(res, 400, 'VALIDATION_ERROR', 'Some fields need your attention.', { fieldErrors });
  }
  if (error instanceof mongoose.Error.CastError) {
    return sendError(res, 400, 'INVALID_VALUE', `Invalid value for ${error.path}.`);
  }

  if (isDatabaseUnavailable(error)) {
    logger.error('Database unavailable', { method: req.method, path: req.path, name: error.name });
    res.set('Retry-After', '10');
    return sendError(
      res,
      503,
      'DATABASE_UNAVAILABLE',
      'My Job Trackr can’t reach its database right now. Please try again in a moment.',
    );
  }

  logger.error('Unhandled error', { method: req.method, path: req.path, name: error.name, stack: error.stack });
  return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.');
}

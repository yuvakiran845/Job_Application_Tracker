import { logger } from '../utils/logger.js';

/**
 * Logs method, path, status and duration for each request. The query string,
 * headers and body are deliberately left out: they can hold search terms,
 * personal details or credentials.
 */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const path = req.originalUrl.split('?')[0];
    logger.info(`${req.method} ${path} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
  });
  next();
}

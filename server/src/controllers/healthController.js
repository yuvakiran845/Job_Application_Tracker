import { getDatabaseStatus } from '../config/database.js';

/** Liveness and database readiness for uptime checks and hosting platforms. */
export function health(_req, res) {
  const database = getDatabaseStatus();
  const healthy = database === 'connected';
  res.status(healthy ? 200 : 503).json({
    data: {
      status: healthy ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
}

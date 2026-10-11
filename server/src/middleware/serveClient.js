import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';

/**
 * Serves the frontend's production build (client/dist) for single-service
 * deployments, so the browser sees one origin: no CORS, first-party cookies.
 *
 * - Hashed files under /assets never change, so browsers may cache them for a year.
 * - index.html is revalidated on every load, so a new deploy is picked up at once.
 * - Any other page request (not /api, not a file) gets index.html, so deep links
 *   like /applications/123 work; the frontend router takes it from there.
 */
export function createClientHandler(distDir) {
  const indexFile = path.join(distDir, 'index.html');
  if (!existsSync(indexFile)) {
    throw new Error('The frontend build is missing. Run "npm run build" first, or set SERVE_CLIENT=false.');
  }

  const router = express.Router();
  router.use('/assets', express.static(path.join(distDir, 'assets'), { index: false, immutable: true, maxAge: '1y' }));
  router.use(express.static(distDir, { index: false, maxAge: '1h' }));
  router.use((req, res, next) => {
    const isPage =
      (req.method === 'GET' || req.method === 'HEAD') &&
      req.path !== '/api' &&
      !req.path.startsWith('/api/') &&
      !path.extname(req.path) &&
      req.accepts('html');
    if (!isPage) return next();
    res.set('Cache-Control', 'no-cache');
    return res.sendFile(indexFile);
  });
  return router;
}

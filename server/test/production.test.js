import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { createClientHandler } from '../src/middleware/serveClient.js';

const base = { MONGODB_URI: 'mongodb://127.0.0.1:27017/careerflow', JWT_SECRET: 'a'.repeat(40) };
const production = { ...base, NODE_ENV: 'production' };

describe('production configuration', () => {
  it('allows only the API’s own origin unless CLIENT_ORIGIN is set', () => {
    expect(parseEnv(production).corsOrigins).toEqual([]);
    expect(parseEnv(base).corsOrigins).toEqual(['http://localhost:5173']);
  });

  it('normalizes deployed origins and rejects values that aren’t origins', () => {
    const config = parseEnv({ ...production, CLIENT_ORIGIN: 'https://App.Example.com/, https://careerflow.example.com:8443' });
    expect(config.corsOrigins).toEqual(['https://app.example.com', 'https://careerflow.example.com:8443']);

    for (const bad of ['https://app.example.com/login', 'app.example.com', 'ftp://app.example.com', 'https://user:pw@app.example.com']) {
      expect(() => parseEnv({ ...production, CLIENT_ORIGIN: bad }), bad).toThrow(/CLIENT_ORIGIN: Each entry must be an origin/);
    }
  });

  it('never echoes configuration values in errors', () => {
    expect(() => parseEnv({ ...production, CLIENT_ORIGIN: 'https://secret-host.example/path' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('secret-host') }),
    );
  });

  it('serves the frontend build in production by default', () => {
    expect(parseEnv(production).client.serve).toBe(true);
    expect(parseEnv({ ...production, SERVE_CLIENT: 'false' }).client.serve).toBe(false);
    expect(parseEnv(base).client.serve).toBe(false);
    expect(parseEnv(production).client.distDir).toMatch(/client[\\/]dist$/);
  });
});

describe('serving the frontend build', () => {
  let distDir;
  let app;
  const bigScript = `console.log(${JSON.stringify('x'.repeat(4000))});`;

  beforeAll(() => {
    distDir = mkdtempSync(path.join(tmpdir(), 'careerflow-dist-'));
    mkdirSync(path.join(distDir, 'assets'));
    writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>CareerFlow</title><div id="root"></div>');
    writeFileSync(path.join(distDir, 'assets', 'index-abc123.js'), bigScript);
    writeFileSync(path.join(distDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    app = createApp({ corsOrigins: [], client: { serve: true, distDir } });
  });

  afterAll(() => rmSync(distDir, { recursive: true, force: true }));

  it('serves index.html for pages and deep links, revalidated on every load', async () => {
    for (const page of ['/', '/applications/6720f1c2a1b2c3d4e5f60718', '/login?next=%2Fpipeline']) {
      const response = await request(app).get(page).set('Accept', 'text/html').expect(200);
      expect(response.text, page).toContain('<div id="root">');
      expect(response.headers['cache-control'], page).toBe('no-cache');
      expect(response.headers['content-security-policy'], page).toContain("script-src 'self'");
    }
  });

  it('caches hashed assets for a year and compresses them', async () => {
    const response = await request(app).get('/assets/index-abc123.js').set('Accept-Encoding', 'gzip').expect(200);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.text).toBe(bigScript);
  });

  it('serves other static files with a short cache', async () => {
    const response = await request(app).get('/favicon.svg').expect(200);
    expect(response.headers['cache-control']).toBe('public, max-age=3600');
  });

  it('answers 404 (not the page) for missing files and unknown API routes', async () => {
    const asset = await request(app).get('/assets/missing-file.js').expect(404);
    expect(asset.headers['content-type']).toMatch(/json/);
    const route = await request(app).get('/api/nope').set('Accept', 'text/html').expect(404);
    expect(route.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('keeps the API working alongside the frontend', async () => {
    const health = await request(app).get('/api/health').expect(200);
    expect(health.body.data.status).toBe('ok');

    // A write from the page's own origin passes the CSRF origin check with no CLIENT_ORIGIN set…
    const agent = request(app);
    const ownOrigin = await agent
      .post('/api/auth/login')
      .set('Host', 'careerflow.example.com')
      .set('Origin', 'http://careerflow.example.com')
      .set('X-CSRF-Protection', '1')
      .send({ email: 'nobody@example.com', password: 'not a real password' });
    expect(ownOrigin.status).toBe(401);
    // …and one from any other origin is refused.
    const foreign = await agent
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .set('X-CSRF-Protection', '1')
      .send({ email: 'nobody@example.com', password: 'not a real password' });
    expect(foreign.status).toBe(403);
  });

  it('refuses to start without a build', () => {
    expect(() => createClientHandler(path.join(distDir, 'does-not-exist'))).toThrow(/frontend build is missing/);
  });
});

describe('CORS for a frontend on its own domain', () => {
  const app = createApp({ corsOrigins: ['https://app.careerflow.example'] });

  it('lets the deployed frontend send credentialed writes with the CSRF header', async () => {
    const preflight = await request(app)
      .options('/api/applications')
      .set('Origin', 'https://app.careerflow.example')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-csrf-protection')
      .expect(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('https://app.careerflow.example');
    expect(preflight.headers['access-control-allow-credentials']).toBe('true');
    expect(preflight.headers['access-control-allow-headers']).toMatch(/x-csrf-protection/i);
  });

  it('gives look-alike and other origins nothing', async () => {
    for (const origin of ['https://app.careerflow.example.evil.example', 'http://app.careerflow.example', 'https://careerflow.example']) {
      const response = await request(app).get('/api/health').set('Origin', origin);
      expect(response.headers['access-control-allow-origin'], origin).toBeUndefined();
    }
  });
});

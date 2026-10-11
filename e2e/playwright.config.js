import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run the real API and a production build of the frontend on
// their own ports and their own database, so they never touch development data.
export const API_PORT = 4100;
export const WEB_PORT = 5174;
export const E2E_MONGODB_URI = process.env.E2E_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/careerflow_e2e';

// Two ways to run:
// - default: the API in development mode, plus the built frontend served by
//   `vite preview` (which forwards /api), on two ports.
// - E2E_MODE=production: exactly what is deployed — `npm start` with NODE_ENV=production,
//   one server for the API and the built frontend, production cookies and headers.
//   Build first (`npm run build` at the repo root). E2E_APP_DIR points at another
//   checkout, e.g. a clean copy built with `npm run build:deploy`.
const PRODUCTION = process.env.E2E_MODE === 'production';
const APP_DIR = path.resolve(process.env.E2E_APP_DIR ?? '..');

// Use an installed browser when available (no download needed): Edge ships with
// Windows. Elsewhere, run `npx playwright install chromium` once, or set
// E2E_BROWSER_CHANNEL to "chrome"/"msedge".
const channel = process.env.E2E_BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined);

const serverEnv = {
  PORT: String(API_PORT),
  MONGODB_URI: E2E_MONGODB_URI,
  // A fresh secret per run: sessions from earlier runs are never valid.
  JWT_SECRET: randomBytes(32).toString('base64url'),
  // The suite signs up many users from one IP.
  LOGIN_RATE_LIMIT: '1000',
  SIGNUP_RATE_LIMIT: '1000',
};

const webServer = PRODUCTION
  ? [
      {
        command: 'npm start',
        cwd: APP_DIR,
        url: `http://localhost:${API_PORT}/api/health`,
        reuseExistingServer: false,
        timeout: 60_000,
        // The lowest bcrypt cost production allows. CLIENT_ORIGIN and TRUST_PROXY are set
        // explicitly so a developer's server/.env can't change them (real variables win).
        env: { ...serverEnv, NODE_ENV: 'production', BCRYPT_ROUNDS: '10', CLIENT_ORIGIN: '', TRUST_PROXY: '0' },
      },
    ]
  : [
      {
        command: 'node src/server.js',
        cwd: path.join(APP_DIR, 'server'),
        url: `http://localhost:${API_PORT}/api/health`,
        reuseExistingServer: false,
        timeout: 60_000,
        env: { ...serverEnv, NODE_ENV: 'development', BCRYPT_ROUNDS: '4', CLIENT_ORIGIN: `http://localhost:${WEB_PORT}` },
      },
      {
        // A production build: the same bundle users get, served with the /api proxy.
        command: `npm run build && npx vite preview --port ${WEB_PORT} --strictPort`,
        cwd: path.join(APP_DIR, 'client'),
        url: `http://localhost:${WEB_PORT}`,
        reuseExistingServer: false,
        timeout: 120_000,
        env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      },
    ];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.js',
  globalTeardown: './global-teardown.js',
  use: {
    baseURL: `http://localhost:${PRODUCTION ? API_PORT : WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1366, height: 900 } },
      testIgnore: /mobile\.spec\.js/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel },
      testMatch: /mobile\.spec\.js/,
    },
  ],
  webServer,
});

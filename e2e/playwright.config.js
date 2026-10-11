import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run the real API and a production build of the frontend on
// their own ports and their own database, so they never touch development data.
export const API_PORT = 4100;
export const WEB_PORT = 5174;
export const E2E_MONGODB_URI = process.env.E2E_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/careerflow_e2e';

// Use an installed browser when available (no download needed): Edge ships with
// Windows. Elsewhere, run `npx playwright install chromium` once, or set
// E2E_BROWSER_CHANNEL to "chrome"/"msedge".
const channel = process.env.E2E_BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined);

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
    baseURL: `http://localhost:${WEB_PORT}`,
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
  webServer: [
    {
      command: 'node src/server.js',
      cwd: '../server',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        MONGODB_URI: E2E_MONGODB_URI,
        CLIENT_ORIGIN: `http://localhost:${WEB_PORT}`,
        JWT_SECRET: 'e2e-only-secret-not-used-anywhere-else-0123456789',
        BCRYPT_ROUNDS: '4',
        // The suite signs up many users from one IP.
        LOGIN_RATE_LIMIT: '1000',
        SIGNUP_RATE_LIMIT: '1000',
      },
    },
    {
      // A production build: the same bundle users get, served with the /api proxy.
      command: `npm run build && npx vite preview --port ${WEB_PORT} --strictPort`,
      cwd: '../client',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});

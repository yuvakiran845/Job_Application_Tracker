import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config.js';

// `npm run screenshots`: regenerates docs/screenshots/*.png from the real app,
// using the same servers and throwaway database as the end-to-end tests.
const channel = base.projects[0].use.channel;

export default defineConfig({
  ...base,
  testDir: './screenshots',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { ...base.use, trace: 'off', screenshot: 'off' },
  projects: [
    {
      name: 'screenshots',
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 }, colorScheme: 'light' },
    },
  ],
});

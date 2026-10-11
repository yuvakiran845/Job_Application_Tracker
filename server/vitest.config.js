import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Starts one throwaway MongoDB for the whole run; each test file gets its own database.
    globalSetup: ['./test/globalSetup.js'],
    setupFiles: ['./test/setup.js'],
    restoreMocks: true,
    testTimeout: 15000,
    hookTimeout: 120000,
  },
});

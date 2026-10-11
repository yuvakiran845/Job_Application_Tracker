import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the browser calls same-origin "/api", which Vite forwards to the
// API server, so no CORS setup is needed locally. Override with API_PROXY_TARGET.
const apiProxy = {
  '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:4000', changeOrigin: false },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    restoreMocks: true,
    // Full-app integration tests type into large forms in jsdom; allow headroom on slower machines.
    testTimeout: 15000,
  },
});

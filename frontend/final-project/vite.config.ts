/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    /*
     * A DEV PROXY, so the browser talks to one origin.
     *
     * Requests to /api and /auth are forwarded to the API, which means the
     * browser sees same-origin requests and CORS never enters the picture
     * during development. It also means VITE_API_BASE_URL can stay empty
     * locally and be set to a real origin in production.
     */
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000', changeOrigin: true },
      '/auth': { target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});

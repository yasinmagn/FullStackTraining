/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    /*
     * jsdom is a JavaScript implementation of the DOM. It is not a browser -
     * no layout, no paint, no real navigation - but it is fast and enough for
     * component tests. Anything that depends on real rendering (visual
     * regressions, CSS behaviour) belongs in Playwright instead.
     */
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});

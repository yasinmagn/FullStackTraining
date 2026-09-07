import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite gives you three things you would otherwise wire up yourself:
// a dev server with hot module replacement, TypeScript/JSX transpilation,
// and an optimised production build.
export default defineConfig({
  plugins: [react()],
});

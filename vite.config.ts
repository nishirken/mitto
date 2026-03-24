import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
  },
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'happy-dom',
    setupFiles: ['src/test-setup.ts'],
  },
});

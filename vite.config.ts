import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';

export default defineConfig({
  build: {
    target: 'es2020',
  },
  plugins: [viteCommonjs()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      telegram: fileURLToPath(new URL('./src/lib/telegram/index.js', import.meta.url)),
    },
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

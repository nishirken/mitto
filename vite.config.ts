import { defineConfig } from 'vite';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  build: {
    target: 'es2020',
  },
  server: {
    port: 3000,
  },
  test: {
    browser: {
      enabled: true,
      instances: [
        {
          browser: 'chromium',
          provider: playwright(),
          launch: {
            executablePath: process.env.CHROME_EXECUTABLE,
          },
        },
      ],
    },
  },
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: '*.spec.mjs',
  use: {
    headless: true,
    viewport: { width: 800, height: 800 },
  },
  timeout: 30000,
});

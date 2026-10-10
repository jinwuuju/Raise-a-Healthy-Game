import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5187', viewport: { width: 1280, height: 900 }, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 5187 --strictPort', url: 'http://127.0.0.1:5187', reuseExistingServer: false },
});

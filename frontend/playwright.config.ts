import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4210',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    // Stands in for the Gemini API so the extraction specs run offline, without a key and without
    // a per-run cost. The backend reaches it only when started with GEMINI_BASE_URL — see
    // `make backend-e2e`.
    {
      command: 'node e2e/gemini-mock.mjs',
      url: 'http://localhost:8099/health',
      reuseExistingServer: true,
      timeout: 20_000,
    },
    {
      command: 'npx ng serve --port 4210',
      url: 'http://localhost:4210',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});

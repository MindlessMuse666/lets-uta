import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const e2eDataRoot = path.resolve(process.cwd(), 'test-results', 'e2e-data');

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run seed && npm run prepare:e2e && npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    env: { KARAOKE_DATA_DIR: e2eDataRoot }
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});

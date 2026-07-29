import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Playwright config para testes contra a Vercel (produção/preview)
 */
export default defineConfig({
  testDir: './tests/e2e/audit',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 120_000,
  use: {
    baseURL: process.env.VERCEL_URL || 'https://i9wisecontent.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'vercel-auth',
      testMatch: /vercel-auth-setup\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'vercel-audit',
      testMatch: /audit-functional-actions\.spec\.ts$/,
      dependencies: ['vercel-auth'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/e2e/audit/.auth/storageState.json',
      },
    },
  ],
  // NO webServer - testing against live Vercel
});

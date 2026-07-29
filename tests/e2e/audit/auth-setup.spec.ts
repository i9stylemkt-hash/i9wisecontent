import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const STORAGE_STATE_PATH = path.resolve(
  process.cwd(),
  'tests/e2e/audit/.auth/storageState.json'
);

setup('authenticate for audit', async ({ page, context }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  // Ensure .auth directory exists
  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  if (!email || !password) {
    console.warn('⚠️  E2E_USER_EMAIL and E2E_USER_PASSWORD not set');
    fs.writeFileSync(
      STORAGE_STATE_PATH,
      JSON.stringify({ cookies: [], origins: [] }),
      'utf-8'
    );
    return;
  }

  console.log('🔐 Authenticating for audit...');

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);

  // Fill login form
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);

  // Submit
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|blogs|articles)/, { timeout: 30000 });
  console.log('✅ Login successful!');

  // Save storage state
  await context.storageState({ path: STORAGE_STATE_PATH });
});

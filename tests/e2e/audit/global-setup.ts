import { chromium, type FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const STORAGE_STATE_PATH = path.resolve(
  process.cwd(),
  'tests/e2e/audit/.auth/storageState.json'
);

async function globalSetup(_config: FullConfig): Promise<void> {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  if (!email || !password) {
    console.warn(
      '⚠️  E2E_USER_EMAIL and E2E_USER_PASSWORD not set in .env.local'
    );
    console.warn('   Audit tests will run without authentication.');
    // Create empty storage state so tests don't crash
    ensureDir(path.dirname(STORAGE_STATE_PATH));
    fs.writeFileSync(
      STORAGE_STATE_PATH,
      JSON.stringify({ cookies: [], origins: [] }),
      'utf-8'
    );
    return;
  }

  console.log('🔐 Audit Global Setup: Logging in...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // Fill login form
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]'
    );

    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(email);
    await passwordInput.fill(password);

    // Submit
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Entrar"), button:has-text("Login")'
    );
    await submitButton.click();

    // Wait for redirect to dashboard or authenticated area
    await page.waitForURL(/\/(dashboard|blogs|articles)/, { timeout: 30000 });
    console.log('✅ Login successful. Saving storage state...');

    // Save storage state
    ensureDir(path.dirname(STORAGE_STATE_PATH));
    await context.storageState({ path: STORAGE_STATE_PATH });
  } catch (error) {
    console.error('❌ Login failed during global setup:', error);
    // Save empty state so tests still run (they'll detect auth issues)
    ensureDir(path.dirname(STORAGE_STATE_PATH));
    fs.writeFileSync(
      STORAGE_STATE_PATH,
      JSON.stringify({ cookies: [], origins: [] }),
      'utf-8'
    );
  } finally {
    await browser.close();
  }
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export default globalSetup;

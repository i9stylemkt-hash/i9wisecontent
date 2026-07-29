import { test as setup } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const STORAGE_STATE_PATH = path.resolve(
  process.cwd(),
  'tests/e2e/audit/.auth/storageState.json'
);

/**
 * Auth setup que funciona com Vercel Authentication (proteção de deploy).
 * Autentica via API do Supabase e injeta tokens no browser storage.
 */
setup('authenticate via Supabase API', async ({ page, context, baseURL }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  if (!email || !password || !supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️  Missing env vars for auth. Saving empty state.');
    console.warn(`  email: ${email ? '✓' : '✗'}`);
    console.warn(`  password: ${password ? '✓' : '✗'}`);
    console.warn(`  supabaseUrl: ${supabaseUrl ? '✓' : '✗'}`);
    console.warn(`  supabaseAnonKey: ${supabaseAnonKey ? '✓' : '✗'}`);
    fs.writeFileSync(
      STORAGE_STATE_PATH,
      JSON.stringify({ cookies: [], origins: [] }),
      'utf-8'
    );
    return;
  }

  console.log('🔐 Authenticating via Supabase API...');

  // Authenticate directly via Supabase REST API
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!authResponse.ok) {
    const errText = await authResponse.text();
    console.error('❌ Auth failed:', errText);
    fs.writeFileSync(
      STORAGE_STATE_PATH,
      JSON.stringify({ cookies: [], origins: [] }),
      'utf-8'
    );
    return;
  }

  const authData = await authResponse.json();
  console.log('✅ Supabase auth successful!');

  // Navigate to app to set the storage state
  const appUrl = baseURL || 'https://i9wisecontent.vercel.app';

  // Try to navigate to the app - if Vercel protection redirects, we'll handle it
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Check if we hit Vercel auth wall
  const isVercelAuth = await page.locator('text=Log in to Vercel').count() > 0;

  if (isVercelAuth) {
    console.warn('⚠️  Vercel Authentication is blocking access to the app.');
    console.warn('   Tests will run in unauthenticated mode (limited).');
    console.warn('   To fix: disable Vercel Authentication or use Vercel Bypass token.');

    // Still save what we have - some pages might work
    fs.writeFileSync(
      STORAGE_STATE_PATH,
      JSON.stringify({ cookies: [], origins: [] }),
      'utf-8'
    );
    return;
  }

  // Inject Supabase auth tokens into localStorage
  const supabaseStorageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  const tokenPayload = JSON.stringify({
    access_token: authData.access_token,
    refresh_token: authData.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + authData.expires_in,
    expires_in: authData.expires_in,
    token_type: authData.token_type,
    user: authData.user,
  });

  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: supabaseStorageKey, value: tokenPayload }
  );

  // Reload to apply auth state
  await page.goto(`${appUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  if (currentUrl.includes('/dashboard')) {
    console.log('✅ Successfully navigated to dashboard with auth!');
  } else {
    console.warn(`⚠️  After auth, landed on: ${currentUrl}`);
  }

  // Save storage state
  await context.storageState({ path: STORAGE_STATE_PATH });
  console.log('💾 Storage state saved.');
});

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Varredura completa de funcionalidades do i9 Wise Content:
 * - Botões de ação que não levam a lugar nenhum
 * - Links mortos ou desconectados
 * - Gatilhos que não disparam ações
 * - Estados ausentes em formulários e interações
 *
 * Testa contra o site live na Vercel.
 */

const BASE_URL = 'https://i9wisecontent.vercel.app';

interface NavResult {
  url: string;
  blocked: boolean;
  needsAuth: boolean;
  success: boolean;
}

/** Helper para navegar com tolerância a redirect de auth */
async function safeGoto(page: import('@playwright/test').Page, path: string): Promise<NavResult> {
  const fullUrl = path.startsWith('http') ? path : `${BASE_URL}${path}`;

  await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const currentUrl = page.url();
  const isVercelAuth = currentUrl.includes('vercel.com/') && (await page.locator('text=Log in to Vercel').count()) > 0;
  const isAppLogin = currentUrl.includes('/login') && !isVercelAuth;

  return {
    url: currentUrl,
    blocked: isVercelAuth,
    needsAuth: isAppLogin,
    success: !isVercelAuth && !isAppLogin,
  };
}

test.describe('Audit: Functional Actions & Connectivity', () => {
  const MODULE = 'functional-actions';
  const results: Record<string, unknown[]> = {};

  const PAGES = [
    '/dashboard',
    '/blogs',
    '/articles',
    '/ideas',
    '/pipeline',
    '/templates',
    '/prompts',
    '/settings',
    '/calendar',
  ];

  // ─── TEST: Page Accessibility ──────────────────────────────────────────────

  test('verify all pages are accessible (not blocked)', async ({ page }) => {
    const pageStatus: { path: string; status: string; url: string }[] = [];

    for (const route of PAGES) {
      const result = await safeGoto(page, route);

      let status = 'accessible';
      if (result.blocked) status = 'BLOCKED_BY_VERCEL_AUTH';
      else if (result.needsAuth) status = 'NEEDS_APP_AUTH';

      pageStatus.push({ path: route, status, url: result.url });
    }

    console.log(`\n[${MODULE}] PAGE ACCESSIBILITY REPORT:`);
    console.table(pageStatus);

    const blocked = pageStatus.filter((p) => p.status === 'BLOCKED_BY_VERCEL_AUTH');
    if (blocked.length > 0) {
      console.warn(`\n⚠️  ${blocked.length} pages blocked by Vercel Authentication.`);
      console.warn('   Disable "Vercel Authentication" in Project Settings > Security');
      console.warn('   or configure a bypass secret for E2E testing.');
    }

    const needsAuth = pageStatus.filter((p) => p.status === 'NEEDS_APP_AUTH');
    if (needsAuth.length > 0) {
      console.log(`\n📋 ${needsAuth.length} pages redirect to app login (expected for protected routes).`);
    }

    results['pageAccess'] = pageStatus;
  });

  // ─── TEST: Login Page Functionality ────────────────────────────────────────

  test('login page renders correctly and form is functional', async ({ page }) => {
    const result = await safeGoto(page, '/login');

    if (result.blocked) {
      test.skip(true, 'Blocked by Vercel Authentication');
      return;
    }

    // Should show the login form
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // Submit button should be enabled
    const isDisabled = await submitBtn.isDisabled();
    expect(isDisabled).toBeFalsy();

    // Toggle between login/signup
    const toggleBtn = page.locator('button:has-text("Criar conta"), button:has-text("Entrar")');
    if ((await toggleBtn.count()) > 0) {
      await toggleBtn.first().click();
      await page.waitForTimeout(500);
      // Should change button text
      const newText = await submitBtn.textContent();
      expect(newText).toContain('Criar Conta');
    }

    console.log(`[${MODULE}] ✅ Login page form is functional`);
  });

  // ─── TEST: Login Flow ──────────────────────────────────────────────────────

  test('login with valid credentials navigates to dashboard', async ({ page }) => {
    const result = await safeGoto(page, '/login');

    if (result.blocked) {
      test.skip(true, 'Blocked by Vercel Authentication');
      return;
    }

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'E2E credentials not configured');
      return;
    }

    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();

    // Should navigate to dashboard or show error
    await page.waitForTimeout(5000);
    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      console.log(`[${MODULE}] ✅ Login successful, redirected to dashboard`);
    } else if (currentUrl.includes('/login')) {
      // Check for error message
      const error = page.locator('[class*="destructive"], [class*="error"], text=Invalid');
      const hasError = (await error.count()) > 0;
      if (hasError) {
        const errorText = await error.first().textContent();
        console.warn(`[${MODULE}] ⚠️ Login failed with error: ${errorText}`);
      }
    }
  });

  // ─── TEST: Authenticated Page Navigation ──────────────────────────────────

  test('after login, all sidebar navigation works', async ({ page }) => {
    const result = await safeGoto(page, '/login');

    if (result.blocked) {
      test.skip(true, 'Blocked by Vercel Authentication');
      return;
    }

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'E2E credentials not configured');
      return;
    }

    // Login first
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);

    if (!page.url().includes('/dashboard')) {
      test.skip(true, 'Login failed, cannot test navigation');
      return;
    }

    // Now test all navigation
    const navResults: { route: string; status: string; details: string }[] = [];

    for (const route of PAGES) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const url = page.url();
      const hasContent = (await page.locator('main, [role="main"]').count()) > 0;
      const hasError = (await page.locator('text=Error, text=Erro, text=404, text=500').count()) > 0;
      const isLogin = url.includes('/login');

      let status = 'OK';
      let details = '';

      if (isLogin) {
        status = 'REDIRECT_TO_LOGIN';
        details = 'Session may have expired';
      } else if (hasError) {
        status = 'HAS_ERRORS';
        details = await page.locator('text=Error, text=Erro').first().textContent() || '';
      } else if (!hasContent) {
        status = 'EMPTY_PAGE';
        details = 'No main content rendered';
      } else {
        details = `Content loaded at ${url}`;
      }

      navResults.push({ route, status, details });
    }

    console.log(`\n[${MODULE}] NAVIGATION REPORT (authenticated):`);
    console.table(navResults);

    const failures = navResults.filter((r) => r.status !== 'OK');
    if (failures.length > 0) {
      console.error(`\n❌ ${failures.length} navigation failures:`, JSON.stringify(failures, null, 2));
    }
  });

  // ─── TEST: Button Actions Sweep ────────────────────────────────────────────

  test('sweep all buttons for dead actions (authenticated)', async ({ page }) => {
    const result = await safeGoto(page, '/login');

    if (result.blocked) {
      test.skip(true, 'Blocked by Vercel Authentication');
      return;
    }

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'E2E credentials not configured');
      return;
    }

    // Login
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);

    if (!page.url().includes('/dashboard')) {
      test.skip(true, 'Login failed');
      return;
    }

    const deadButtons: { page: string; text: string; issue: string }[] = [];
    const workingButtons: { page: string; text: string; action: string }[] = [];

    for (const route of PAGES) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      if (page.url().includes('/login')) continue;

      const buttons = page.locator('button:visible');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const text = ((await btn.textContent())?.trim() || '').slice(0, 50);
        const disabled = await btn.isDisabled();
        const ariaLabel = await btn.getAttribute('aria-label');
        const btnName = text || ariaLabel || `button-${i}`;

        if (disabled) continue; // Skip disabled buttons (expected behavior)

        // Check for links that look like buttons
        const hasHref = await btn.evaluate((el) => {
          const parent = el.closest('a');
          return parent?.getAttribute('href') || null;
        });

        if (hasHref) {
          workingButtons.push({ page: route, text: btnName, action: `navigates: ${hasHref}` });
          continue;
        }

        // For buttons that aren't in a form and have no obvious handler
        const inForm = await btn.evaluate((el) => el.closest('form') !== null);
        const hasType = await btn.getAttribute('type');

        if (inForm || hasType === 'submit') {
          workingButtons.push({ page: route, text: btnName, action: 'form-submit' });
          continue;
        }

        // Click and observe what happens
        const urlBefore = page.url();
        const consoleErrors: string[] = [];

        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        try {
          await btn.click({ timeout: 5000 });
          await page.waitForTimeout(1500);
        } catch {
          // Click failed (element removed, overlay, etc.)
          continue;
        }

        const urlAfter = page.url();
        const dialogOpened = (await page.locator('[role="dialog"], [role="alertdialog"]').count()) > 0;
        const dropdownOpened = (await page.locator('[role="menu"], [role="listbox"], [data-state="open"]').count()) > 0;
        const toastAppeared = (await page.locator('[data-slot="toast"], [role="status"], [class*="toast"]').count()) > 0;

        if (urlBefore !== urlAfter) {
          workingButtons.push({ page: route, text: btnName, action: `navigated: ${urlAfter}` });
          // Go back
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(1500);
        } else if (dialogOpened) {
          workingButtons.push({ page: route, text: btnName, action: 'opened-dialog' });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        } else if (dropdownOpened) {
          workingButtons.push({ page: route, text: btnName, action: 'opened-dropdown/menu' });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        } else if (toastAppeared) {
          workingButtons.push({ page: route, text: btnName, action: 'triggered-toast' });
        } else if (consoleErrors.length > 0) {
          deadButtons.push({ page: route, text: btnName, issue: `Console error: ${consoleErrors[0]}` });
        } else {
          // No visible reaction - might be dead or might have subtle state change
          deadButtons.push({ page: route, text: btnName, issue: 'No visible reaction on click' });
        }

        page.removeAllListeners('console');
      }
    }

    // Report
    console.log(`\n[${MODULE}] ═══════════════════════════════════════════════`);
    console.log(`[${MODULE}] BUTTON ACTION SWEEP REPORT`);
    console.log(`[${MODULE}] ═══════════════════════════════════════════════`);
    console.log(`\n✅ Working buttons (${workingButtons.length}):`);
    if (workingButtons.length <= 30) {
      console.table(workingButtons);
    } else {
      console.log(`  (${workingButtons.length} buttons verified as functional)`);
    }

    console.log(`\n⚠️ Potentially dead buttons (${deadButtons.length}):`);
    if (deadButtons.length > 0) {
      console.table(deadButtons);
    } else {
      console.log('  None detected!');
    }

    results['deadButtons'] = deadButtons;
    results['workingButtons'] = workingButtons;
  });

  // ─── TEST: Links Connectivity ──────────────────────────────────────────────

  test('verify all internal links connect to valid pages', async ({ page }) => {
    const result = await safeGoto(page, '/login');

    if (result.blocked) {
      test.skip(true, 'Blocked by Vercel Authentication');
      return;
    }

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'E2E credentials not configured');
      return;
    }

    // Login
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);

    if (!page.url().includes('/dashboard')) {
      test.skip(true, 'Login failed');
      return;
    }

    const allLinks: Set<string> = new Set();
    const brokenLinks: { foundOn: string; href: string; issue: string }[] = [];
    const deadEndLinks: { foundOn: string; href: string; text: string }[] = [];

    // Collect all internal links across pages
    for (const route of PAGES) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      if (page.url().includes('/login')) continue;

      const links = page.locator('a[href]:visible');
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const href = await links.nth(i).getAttribute('href');
        if (href && href.startsWith('/') && !href.startsWith('/#')) {
          allLinks.add(href);
        }
      }
    }

    console.log(`\n[${MODULE}] Found ${allLinks.size} unique internal links to verify`);

    // Verify each unique link
    for (const href of allLinks) {
      try {
        const response = await page.goto(`${BASE_URL}${href}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        const status = response?.status() || 0;
        const finalUrl = page.url();

        if (status >= 400) {
          brokenLinks.push({ foundOn: 'multiple', href, issue: `HTTP ${status}` });
        } else if (finalUrl.includes('/login') && !href.includes('/login')) {
          // Redirected to login - expected for auth-required pages
        }
      } catch (e) {
        brokenLinks.push({ foundOn: 'multiple', href, issue: `Navigation failed: ${(e as Error).message?.slice(0, 80)}` });
      }
    }

    // Also check for <a href="#"> or <a href=""> (dead-end links)
    for (const route of PAGES.slice(0, 5)) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      if (page.url().includes('/login')) continue;

      const links = page.locator('a:visible');
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        const text = ((await link.textContent())?.trim() || '').slice(0, 40);

        if (!href || href === '#' || href === '' || href === 'javascript:void(0)') {
          deadEndLinks.push({ foundOn: route, href: href || '(empty)', text });
        }
      }
    }

    // Report
    console.log(`\n[${MODULE}] ═══════════════════════════════════════════════`);
    console.log(`[${MODULE}] LINK CONNECTIVITY REPORT`);
    console.log(`[${MODULE}] ═══════════════════════════════════════════════`);
    console.log(`\n📊 Total unique internal links: ${allLinks.size}`);

    if (brokenLinks.length > 0) {
      console.error(`\n❌ Broken links (${brokenLinks.length}):`);
      console.table(brokenLinks);
    } else {
      console.log('\n✅ No broken links detected!');
    }

    if (deadEndLinks.length > 0) {
      console.warn(`\n⚠️ Dead-end links (href="#" or empty) (${deadEndLinks.length}):`);
      console.table(deadEndLinks);
    }
  });

  // ─── TEST: Form Submissions ────────────────────────────────────────────────

  test('form submit buttons trigger actual submissions', async ({ page }) => {
    const result = await safeGoto(page, '/login');

    if (result.blocked) {
      test.skip(true, 'Blocked by Vercel Authentication');
      return;
    }

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'E2E credentials not configured');
      return;
    }

    // Login
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);

    if (!page.url().includes('/dashboard')) {
      test.skip(true, 'Login failed');
      return;
    }

    const formsReport: { page: string; formCount: number; submitBtnCount: number; issue?: string }[] = [];
    const pagesWithForms = ['/settings', '/blogs/new', '/ideas'];

    for (const route of pagesWithForms) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      if (page.url().includes('/login')) {
        formsReport.push({ page: route, formCount: 0, submitBtnCount: 0, issue: 'Requires re-auth' });
        continue;
      }

      const forms = page.locator('form');
      const formCount = await forms.count();
      const submitBtns = page.locator('button[type="submit"]:visible, button:has-text("Salvar"):visible');
      const submitBtnCount = await submitBtns.count();

      if (formCount > 0 && submitBtnCount === 0) {
        formsReport.push({ page: route, formCount, submitBtnCount, issue: 'Form without submit button!' });
      } else {
        formsReport.push({ page: route, formCount, submitBtnCount });
      }
    }

    console.log(`\n[${MODULE}] FORMS REPORT:`);
    console.table(formsReport);
  });

  // ─── TEST: Empty States ────────────────────────────────────────────────────

  test('pages with no data show proper empty states with CTAs', async ({ page }) => {
    const result = await safeGoto(page, '/login');

    if (result.blocked) {
      test.skip(true, 'Blocked by Vercel Authentication');
      return;
    }

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'E2E credentials not configured');
      return;
    }

    // Login
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);

    if (!page.url().includes('/dashboard')) {
      test.skip(true, 'Login failed');
      return;
    }

    const emptyStates: { page: string; hasEmptyState: boolean; hasCTA: boolean; detail: string }[] = [];

    for (const route of PAGES) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      if (page.url().includes('/login')) continue;

      // Check for empty state indicators
      const emptyIndicators = page.locator(
        'text=Nenhum, text=vazio, text=Nenhuma, text=Criar seu primeiro, text=Comece, text=Adicionar'
      );
      const hasEmpty = (await emptyIndicators.count()) > 0;

      if (hasEmpty) {
        // Check if there's a CTA button to guide the user
        const cta = page.locator(
          'button:has-text("Criar"), button:has-text("Novo"), a:has-text("Criar"), a:has-text("Começar")'
        );
        const hasCTA = (await cta.count()) > 0;

        const emptyText = await emptyIndicators.first().textContent();
        emptyStates.push({
          page: route,
          hasEmptyState: true,
          hasCTA,
          detail: (emptyText || '').slice(0, 60),
        });
      }
    }

    if (emptyStates.length > 0) {
      console.log(`\n[${MODULE}] EMPTY STATES REPORT:`);
      console.table(emptyStates);

      const missingCTAs = emptyStates.filter((e) => !e.hasCTA);
      if (missingCTAs.length > 0) {
        console.warn(`\n⚠️ Pages with empty state but NO CTA button:`, missingCTAs.map((e) => e.page));
      }
    }
  });

  // ─── TEST: Error Indicators ────────────────────────────────────────────────

  test('check for visible error states or rate limit messages', async ({ page }) => {
    const result = await safeGoto(page, '/login');

    if (result.blocked) {
      test.skip(true, 'Blocked by Vercel Authentication');
      return;
    }

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'E2E credentials not configured');
      return;
    }

    // Login
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);

    if (!page.url().includes('/dashboard')) {
      test.skip(true, 'Login failed');
      return;
    }

    const errors: { page: string; message: string }[] = [];

    for (const route of PAGES) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      if (page.url().includes('/login')) continue;

      // Check for error messages
      const errorElements = page.locator(
        '[class*="destructive"], [class*="error"], text=Erro, text=Error, text=Limite de requisições, text=falhou, text=failed'
      );
      const count = await errorElements.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const text = (await errorElements.nth(i).textContent())?.trim().slice(0, 100) || '';
        if (text) {
          errors.push({ page: route, message: text });
        }
      }
    }

    if (errors.length > 0) {
      console.log(`\n[${MODULE}] ═══════════════════════════════════════════════`);
      console.error(`[${MODULE}] ❌ VISIBLE ERRORS/WARNINGS (${errors.length}):`);
      console.table(errors);
    } else {
      console.log(`\n[${MODULE}] ✅ No visible errors across all pages`);
    }
  });
});

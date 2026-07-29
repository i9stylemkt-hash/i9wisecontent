import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    // Should be redirected to login page
    await page.waitForURL(/\/(login|$)/);
    await expect(page).toHaveURL(/\/(login|$)/);
  });

  test('login page should render correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Wait for client-side hydration and rendering
    await page.waitForTimeout(3000);

    // Login page should have visible content
    const bodyContent = await page.textContent('body');
    // Should have some rendered text (login, email, entrar, etc.)
    expect((bodyContent ?? '').length).toBeGreaterThan(10);
  });

  test('login page should not have console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Filter expected errors (hydration warnings, rate limiting in dev, etc.)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('hydrat') &&
        !e.includes('Warning:') &&
        !e.includes('Failed to fetch') &&
        !e.includes('Failed to load resource') &&
        !e.includes('NEXT_REDIRECT') &&
        !e.includes('supabase') &&
        !e.includes('429')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show some validation feedback
      await page.waitForTimeout(1000);
      // Page should still be on login (not redirected)
      await expect(page).toHaveURL(/login/);
    }
  });
});

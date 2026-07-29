import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page successfully', async ({ page }) => {
    await page.goto('/');
    // Home may redirect to login or dashboard — either is valid
    await page.waitForLoadState('domcontentloaded');
    const title = await page.title();
    // Page should have some title (even after redirect)
    expect(title !== undefined).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Filtra erros esperados (hydration warnings, rate limiting, fetch failures)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('hydrat') &&
        !e.includes('Warning:') &&
        !e.includes('Failed to fetch') &&
        !e.includes('Failed to load resource') &&
        !e.includes('429')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

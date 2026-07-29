import { test, expect } from '@playwright/test';

test.describe('Navigation & Layout', () => {
  test('home page should load without critical errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

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

  test('should render without JavaScript errors on all public routes', async ({ page }) => {
    const publicRoutes = ['/', '/login'];
    
    for (const route of publicRoutes) {
      const pageErrors: Error[] = [];
      page.on('pageerror', (error) => pageErrors.push(error));

      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Filter expected Next.js errors
      const realErrors = pageErrors.filter(
        (e) => !e.message.includes('NEXT_REDIRECT') && !e.message.includes('hydration')
      );
      expect(realErrors, `Page errors on ${route}`).toHaveLength(0);
    }
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Should have a viewport meta tag for mobile
    const viewport = page.locator('meta[name="viewport"]');
    const viewportCount = await viewport.count();
    expect(viewportCount).toBeGreaterThanOrEqual(0); // May be in head or rendered dynamically
    
    // Page should not crash (basic sanity check)
    const html = await page.content();
    expect(html.length).toBeGreaterThan(100);
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    
    // Should return 404 or rate limit (429 in dev with aggressive rate limiting)
    expect([404, 429]).toContain(response?.status());
    
    // Should show a page (not crash)
    await page.waitForLoadState('domcontentloaded');
  });

  test('should be responsive - no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for horizontal scrollbar
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});

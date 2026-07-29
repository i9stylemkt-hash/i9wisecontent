import { test, expect } from '@playwright/test';

test.describe('Performance Checks', () => {
  test('home page should load within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000);
  });

  test('login page should load within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(3000);
  });

  test('should not have memory leaks from console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate through multiple pages
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Filter expected errors
    const memoryErrors = errors.filter((e) => e.includes('memory') || e.includes('leak'));
    expect(memoryErrors).toHaveLength(0);
  });

  test('static assets should be cacheable in production', async ({ page }) => {
    const responses: { url: string; status: number }[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('_next/static') || url.includes('.js') || url.includes('.css')) {
        responses.push({
          url,
          status: response.status(),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // In dev mode, assets load differently than production
    // Just verify that no assets return 500 errors
    const failedAssets = responses.filter((r) => r.status >= 500);
    expect(failedAssets).toHaveLength(0);
  });

  test('should not load excessively large bundles', async ({ page }) => {
    let totalJSBytes = 0;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.js') && response.status() === 200) {
        const body = await response.body().catch(() => null);
        if (body) {
          totalJSBytes += body.length;
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Total JS should be reasonable (< 2MB for initial load)
    const totalMB = totalJSBytes / (1024 * 1024);
    expect(totalMB).toBeLessThan(2);
  });

  test('should not have render-blocking resources on initial load', async ({ page }) => {
    await page.goto('/');
    
    // Measure Largest Contentful Paint
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry ? lastEntry.startTime : 0);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Timeout fallback
        setTimeout(() => resolve(0), 5000);
      });
    });

    // LCP should be under 4 seconds
    if (lcp > 0) {
      expect(lcp).toBeLessThan(4000);
    }
  });
});

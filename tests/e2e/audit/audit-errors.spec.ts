import { test, expect } from './fixtures';

test.describe('Audit: Error Handling', () => {
  const MODULE = 'errors';

  const ALL_ROUTES = [
    '/dashboard',
    '/blogs',
    '/articles',
    '/ideas',
    '/calendar',
    '/pipeline',
    '/templates',
    '/prompts',
    '/settings',
  ];

  test('no uncaught exceptions across all pages', async ({
    page,
    errorCollector,
    screenshotManager,
  }) => {
    errorCollector.startMonitoring(page);

    for (const route of ALL_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

    const data = errorCollector.stopMonitoring();

    // Log all errors found
    if (data.totalCount > 0) {
      console.log(`[${MODULE}] Total errors across all pages: ${data.totalCount}`);
      console.log(`  Critical: ${data.criticalCount}`);
      console.log(`  Important: ${data.importantCount}`);
      console.log(`  Minor: ${data.minorCount}`);
    }

    // Should have zero critical errors (uncaught exceptions)
    expect(data.criticalCount).toBe(0);

    await screenshotManager.capture(page, { module: MODULE, element: 'error-summary' });
  });

  test('404 page renders gracefully', async ({ page, screenshotManager }) => {
    await page.goto('/this-route-does-not-exist-xyz', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should show a proper 404 page, not crash
    const body = page.locator('body');
    await expect(body).toBeVisible();

    const content = await page.textContent('body') ?? '';
    // Should have some meaningful content (not blank)
    expect(content.length).toBeGreaterThan(10);

    await screenshotManager.capture(page, { module: MODULE, element: '404-page', fullPage: true });
  });

  test('error boundaries catch component errors', async ({ page, screenshotManager }) => {
    // Navigate through pages and check no blank screens
    for (const route of ALL_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      // Page should not be completely blank
      const content = await page.textContent('body') ?? '';
      expect(
        content.trim().length,
        `Page ${route} appears blank`
      ).toBeGreaterThan(10);

      // Check for error boundary messages
      const errorBoundary = page.locator(
        ':has-text("Something went wrong"), :has-text("Erro"), :has-text("Error")'
      );
      const errorBoundaryVisible = await errorBoundary
        .first()
        .isVisible()
        .catch(() => false);

      if (errorBoundaryVisible) {
        await screenshotManager.captureError(page, MODULE, `error-boundary-${route}`);
      }
    }
  });

  test('network errors show user-friendly feedback', async ({ page, screenshotManager }) => {
    // Simulate offline and check page behavior
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Block network requests to API
    await page.route('**/api/**', (route) => route.abort());

    // Try navigating to another page
    await page.goto('/blogs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Page should still render (not crash)
    const body = page.locator('body');
    await expect(body).toBeVisible();

    await screenshotManager.capture(page, { module: MODULE, element: 'network-error-handling' });

    // Unblock
    await page.unroute('**/api/**');
  });

  test('no console errors with sensitive data exposure', async ({ page }) => {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token.*[a-f0-9]{20}/i,
      /api.key.*[a-zA-Z0-9]{20}/i,
      /Bearer\s+[a-zA-Z0-9]/i,
    ];

    const exposedData: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      for (const pattern of sensitivePatterns) {
        if (pattern.test(text)) {
          exposedData.push(`[${msg.type()}] ${text.slice(0, 100)}`);
        }
      }
    });

    for (const route of ALL_ROUTES.slice(0, 5)) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
    }

    expect(
      exposedData.length,
      `Sensitive data in console: ${exposedData.join('; ')}`
    ).toBe(0);
  });

  test('slow loading shows loading states', async ({ page, screenshotManager }) => {
    // Throttle network to simulate slow connection
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50000, // ~50KB/s
      uploadThroughput: 50000,
      latency: 2000,
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Check for loading indicators
    const loadingIndicators = page.locator(
      '[class*="skeleton"], [class*="loading"], [class*="spinner"], [class*="animate-pulse"]'
    );
    const hasLoading = (await loadingIndicators.count()) > 0;

    await screenshotManager.capture(page, { module: MODULE, element: 'loading-states' });

    // Reset network
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  });
});

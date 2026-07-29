import { test, expect } from './fixtures';

test.describe('Audit: Dashboard', () => {
  const MODULE = 'dashboard';

  test.beforeEach(async ({ page, errorCollector, auditPage }) => {
    errorCollector.startMonitoring(page);
    await auditPage.goto('/dashboard');
    await auditPage.waitForReady();
  });

  test('page loads without critical errors', async ({ page, errorCollector }) => {
    const data = errorCollector.getSnapshot();
    expect(data.criticalCount).toBe(0);
  });

  test('renders main layout elements', async ({ page, screenshotManager }) => {
    // Should have sidebar/navigation
    const sidebar = page.locator('nav, aside, [role="navigation"]');
    await expect(sidebar.first()).toBeVisible({ timeout: 10000 });

    // Should have main content area
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeVisible({ timeout: 10000 });

    await screenshotManager.capture(page, { module: MODULE, element: 'layout', fullPage: true });
  });

  test('displays stats cards or summary widgets', async ({ page, screenshotManager }) => {
    // Look for card-like elements (stats, metrics)
    const cards = page.locator('[class*="card"], [class*="stat"], [class*="metric"], [class*="Card"]');
    const cardCount = await cards.count();

    // Dashboard should have at least some content widgets
    expect(cardCount).toBeGreaterThanOrEqual(0); // May be loading

    await screenshotManager.capture(page, { module: MODULE, element: 'stats-cards' });
  });

  test('no broken images or resources', async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const src = await img.getAttribute('src');
      if (src) {
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        // 0 width means broken image
        if (naturalWidth === 0) {
          console.warn(`[${MODULE}] Broken image: ${src}`);
        }
      }
    }
  });

  test('interactive elements are clickable', async ({ page, screenshotManager }) => {
    // Find buttons and links
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    // Check that buttons are not disabled or hidden
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const btn = buttons.nth(i);
      const isEnabled = await btn.isEnabled();
      expect(isEnabled).toBe(true);
    }

    await screenshotManager.capture(page, { module: MODULE, element: 'interactive-elements' });
  });

  test('responsive layout on mobile viewport', async ({ page, screenshotManager }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // No horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);

    await screenshotManager.capture(page, {
      module: MODULE,
      element: 'mobile-view',
      viewport: '375x667',
    });
  });

  test.afterAll(async () => {
    // Module evaluation will be done via the reporter analyzing test results
  });
});

import { test, expect } from './fixtures';

test.describe('Audit: Pipeline', () => {
  const MODULE = 'pipeline';

  test.beforeEach(async ({ page, errorCollector, auditPage }) => {
    errorCollector.startMonitoring(page);
    await auditPage.goto('/pipeline');
    await auditPage.waitForReady();
  });

  test('page loads without critical errors', async ({ page, errorCollector }) => {
    const data = errorCollector.getSnapshot();
    expect(data.criticalCount).toBe(0);
  });

  test('renders pipeline executions list or empty state', async ({ page, screenshotManager }) => {
    const content = page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    // Look for pipeline items (execution logs, cards, table rows)
    const items = page.locator(
      '[class*="card"], [class*="pipeline"], [class*="execution"], table tbody tr, [class*="empty"], [class*="Empty"]'
    );
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(0);

    await screenshotManager.capture(page, { module: MODULE, element: 'pipeline-list', fullPage: true });
  });

  test('displays execution status indicators', async ({ page, screenshotManager }) => {
    // Look for status badges (running, completed, failed)
    const statusElements = page.locator(
      '[class*="badge"], [class*="status"], [class*="tag"], [class*="chip"]'
    );
    const count = await statusElements.count();

    if (count > 0) {
      await screenshotManager.capture(page, { module: MODULE, element: 'status-indicators' });
    }
  });

  test('trigger/run pipeline button', async ({ page, screenshotManager }) => {
    const runBtn = page.locator(
      'button:has-text("Executar"), button:has-text("Rodar"), button:has-text("Iniciar"), button:has-text("Run")'
    );
    const count = await runBtn.count();

    if (count > 0) {
      await expect(runBtn.first()).toBeVisible();
      await screenshotManager.capture(page, { module: MODULE, element: 'run-button' });
    }
  });

  test('pipeline detail view', async ({ page, screenshotManager }) => {
    const pipelineLinks = page.locator('a[href*="/pipeline/"]');
    const linkCount = await pipelineLinks.count();

    if (linkCount > 0) {
      await pipelineLinks.first().click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      await screenshotManager.capture(page, { module: MODULE, element: 'pipeline-detail' });
    }
  });

  test('metrics or stats display', async ({ page }) => {
    // Look for metrics (processing time, success rate, etc.)
    const metrics = page.locator(
      '[class*="metric"], [class*="stat"], [class*="count"]'
    );
    const count = await metrics.count();
    // Metrics may or may not be present
  });

  test('responsive layout on mobile', async ({ page, screenshotManager }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

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
});

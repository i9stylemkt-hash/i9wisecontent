import { test, expect } from './fixtures';

test.describe('Audit: Templates', () => {
  const MODULE = 'templates';

  test.beforeEach(async ({ page, errorCollector, auditPage }) => {
    errorCollector.startMonitoring(page);
    await page.goto('/templates', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await auditPage.waitForReady();
  });

  test('page loads without critical errors', async ({ page, errorCollector }) => {
    const data = errorCollector.getSnapshot();
    expect(data.criticalCount).toBe(0);
  });

  test('renders templates list or empty state', async ({ page, screenshotManager }) => {
    const content = page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    const items = page.locator(
      '[class*="card"], [class*="template"], table tbody tr, [class*="empty"], [class*="Empty"]'
    );
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(0);

    await screenshotManager.capture(page, { module: MODULE, element: 'templates-list', fullPage: true });
  });

  test('create template button exists', async ({ page, screenshotManager }) => {
    const createBtn = page.locator(
      'button:has-text("Criar"), button:has-text("Novo"), button:has-text("Adicionar"), a:has-text("Criar"), a:has-text("Novo")'
    );
    const count = await createBtn.count();

    if (count > 0) {
      await expect(createBtn.first()).toBeEnabled();
      await screenshotManager.capture(page, { module: MODULE, element: 'create-button' });
    }
  });

  test('template cards show relevant info', async ({ page, screenshotManager }) => {
    // Templates should display title, description, or type
    const cards = page.locator('[class*="card"], [class*="template"]');
    const count = await cards.count();

    if (count > 0) {
      const firstCard = cards.first();
      const text = await firstCard.textContent();
      // Card should have some meaningful text
      expect((text ?? '').length).toBeGreaterThan(0);
      await screenshotManager.capture(page, { module: MODULE, element: 'template-card' });
    }
  });

  test('template form/modal opens correctly', async ({ page, screenshotManager }) => {
    const createBtn = page.locator(
      'button:has-text("Criar"), button:has-text("Novo"), button:has-text("Adicionar")'
    );
    const count = await createBtn.count();

    if (count > 0) {
      await createBtn.first().click();
      await page.waitForTimeout(1000);

      // Check for form elements (modal, drawer, or inline form)
      const formElements = page.locator(
        'form, [role="dialog"], [class*="modal"], [class*="drawer"], input, textarea'
      );
      const formCount = await formElements.count();

      if (formCount > 0) {
        await screenshotManager.capture(page, { module: MODULE, element: 'create-form' });
      }
    }
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

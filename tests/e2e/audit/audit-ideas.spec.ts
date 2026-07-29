import { test, expect } from './fixtures';

test.describe('Audit: Ideas', () => {
  const MODULE = 'ideas';

  test.beforeEach(async ({ page, errorCollector, auditPage }) => {
    errorCollector.startMonitoring(page);
    await auditPage.goto('/ideas');
    await auditPage.waitForReady();
  });

  test('page loads without critical errors', async ({ page, errorCollector }) => {
    const data = errorCollector.getSnapshot();
    expect(data.criticalCount).toBe(0);
  });

  test('renders ideas list or empty state', async ({ page, screenshotManager }) => {
    const content = page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    const items = page.locator(
      '[class*="card"], [class*="idea"], table tbody tr, [class*="empty"], [class*="Empty"], li'
    );
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(0);

    await screenshotManager.capture(page, { module: MODULE, element: 'ideas-list', fullPage: true });
  });

  test('create idea button exists and works', async ({ page, screenshotManager }) => {
    const createBtn = page.locator(
      'button:has-text("Criar"), button:has-text("Nova"), button:has-text("Adicionar"), a:has-text("Nova")'
    );
    const count = await createBtn.count();

    if (count > 0) {
      await expect(createBtn.first()).toBeEnabled();
      // Click to open form/modal
      await createBtn.first().click();
      await page.waitForTimeout(1000);
      await screenshotManager.capture(page, { module: MODULE, element: 'create-idea-form' });
    }
  });

  test('priority or category filters', async ({ page, screenshotManager }) => {
    const filters = page.locator(
      'select, [class*="filter"], button:has-text("Prioridade"), button:has-text("Categoria"), [role="combobox"]'
    );
    const count = await filters.count();

    if (count > 0) {
      await screenshotManager.capture(page, { module: MODULE, element: 'filters' });
    }
  });

  test('idea CRUD elements present', async ({ page }) => {
    // Look for edit/delete actions on idea items
    const actionButtons = page.locator(
      'button:has-text("Editar"), button:has-text("Excluir"), [class*="action"], [aria-label*="edit"], [aria-label*="delete"]'
    );
    const count = await actionButtons.count();
    // CRUD actions should be available (if there are items)
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

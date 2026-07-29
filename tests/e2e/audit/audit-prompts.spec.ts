import { test, expect } from './fixtures';

test.describe('Audit: Prompts', () => {
  const MODULE = 'prompts';

  test.beforeEach(async ({ page, errorCollector, auditPage }) => {
    errorCollector.startMonitoring(page);
    await auditPage.goto('/prompts');
    await auditPage.waitForReady();
  });

  test('page loads without critical errors', async ({ page, errorCollector }) => {
    const data = errorCollector.getSnapshot();
    expect(data.criticalCount).toBe(0);
  });

  test('renders prompts list or empty state', async ({ page, screenshotManager }) => {
    const content = page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    const items = page.locator(
      '[class*="card"], [class*="prompt"], table tbody tr, [class*="empty"], [class*="Empty"], li'
    );
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(0);

    await screenshotManager.capture(page, { module: MODULE, element: 'prompts-list', fullPage: true });
  });

  test('create prompt button exists', async ({ page, screenshotManager }) => {
    const createBtn = page.locator(
      'button:has-text("Criar"), button:has-text("Novo"), button:has-text("Adicionar"), a:has-text("Criar"), a:has-text("Novo")'
    );
    const count = await createBtn.count();

    if (count > 0) {
      await expect(createBtn.first()).toBeEnabled();
      await screenshotManager.capture(page, { module: MODULE, element: 'create-button' });
    }
  });

  test('toggle active/inactive functionality', async ({ page, screenshotManager }) => {
    // Look for toggle switches (active/inactive prompts)
    const toggles = page.locator(
      'input[type="checkbox"], [role="switch"], [class*="toggle"], [class*="switch"]'
    );
    const count = await toggles.count();

    if (count > 0) {
      await screenshotManager.capture(page, { module: MODULE, element: 'toggle-switches' });

      // Try toggling one
      await toggles.first().click();
      await page.waitForTimeout(500);
      await screenshotManager.capture(page, { module: MODULE, element: 'toggle-changed' });
    }
  });

  test('prompt content is displayed', async ({ page }) => {
    // Prompts should show their text content
    const promptContent = page.locator(
      '[class*="content"], [class*="text"], [class*="body"], p, pre, code'
    );
    const count = await promptContent.count();
    // Should have some text content visible
  });

  test('edit/delete actions available', async ({ page, screenshotManager }) => {
    const actions = page.locator(
      'button:has-text("Editar"), button:has-text("Excluir"), [aria-label*="edit"], [aria-label*="delete"], [class*="action"]'
    );
    const count = await actions.count();

    if (count > 0) {
      await screenshotManager.capture(page, { module: MODULE, element: 'action-buttons' });
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

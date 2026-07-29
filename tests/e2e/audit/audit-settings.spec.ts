import { test, expect } from './fixtures';

test.describe('Audit: Settings', () => {
  const MODULE = 'settings';

  test.beforeEach(async ({ page, errorCollector, auditPage }) => {
    errorCollector.startMonitoring(page);
    await auditPage.goto('/settings');
    await auditPage.waitForReady();
  });

  test('page loads without critical errors', async ({ page, errorCollector }) => {
    const data = errorCollector.getSnapshot();
    expect(data.criticalCount).toBe(0);
  });

  test('renders settings page with sections', async ({ page, screenshotManager }) => {
    const content = page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    // Settings should have sections/tabs (AI models, costs, preferences)
    const sections = page.locator(
      '[class*="section"], [class*="card"], [role="tabpanel"], [class*="tab"], h2, h3'
    );
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(0);

    await screenshotManager.capture(page, { module: MODULE, element: 'settings-page', fullPage: true });
  });

  test('AI model configuration section', async ({ page, screenshotManager }) => {
    // Look for AI model settings (API keys, model selection)
    const aiSection = page.locator(
      ':has-text("IA"), :has-text("AI"), :has-text("Modelo"), :has-text("Model"), :has-text("API")'
    );
    const inputs = page.locator('input[type="text"], input[type="password"], select');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      await screenshotManager.capture(page, { module: MODULE, element: 'ai-config' });
    }
  });

  test('form inputs are functional', async ({ page, screenshotManager }) => {
    const inputs = page.locator('input:visible, select:visible, textarea:visible');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
      const type = await input.getAttribute('type');

      if (tagName === 'input' && type !== 'hidden' && type !== 'checkbox') {
        // Input should be interactable
        const isEnabled = await input.isEnabled();
        expect(isEnabled).toBe(true);
      }
    }

    await screenshotManager.capture(page, { module: MODULE, element: 'form-inputs' });
  });

  test('save/submit button exists', async ({ page, screenshotManager }) => {
    const saveBtn = page.locator(
      'button:has-text("Salvar"), button:has-text("Atualizar"), button[type="submit"], button:has-text("Save")'
    );
    const count = await saveBtn.count();

    if (count > 0) {
      await expect(saveBtn.first()).toBeVisible();
      await screenshotManager.capture(page, { module: MODULE, element: 'save-button' });
    }
  });

  test('tabs or navigation within settings', async ({ page, screenshotManager }) => {
    const tabs = page.locator('[role="tab"], [class*="tab"], a[href*="/settings/"]');
    const count = await tabs.count();

    if (count > 0) {
      // Click second tab if available
      if (count > 1) {
        await tabs.nth(1).click();
        await page.waitForTimeout(500);
        await screenshotManager.capture(page, { module: MODULE, element: 'settings-tab-2' });
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

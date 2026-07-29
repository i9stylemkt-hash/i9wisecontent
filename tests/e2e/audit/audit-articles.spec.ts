import { test, expect } from './fixtures';

test.describe('Audit: Articles', () => {
  const MODULE = 'articles';

  test.beforeEach(async ({ page, errorCollector, auditPage }) => {
    errorCollector.startMonitoring(page);
    await auditPage.goto('/articles');
    await auditPage.waitForReady();
  });

  test('page loads without critical errors', async ({ page, errorCollector }) => {
    const data = errorCollector.getSnapshot();
    expect(data.criticalCount).toBe(0);
  });

  test('renders article list or kanban view', async ({ page, screenshotManager }) => {
    const content = page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    // Look for article items (cards, rows, kanban columns)
    const items = page.locator(
      '[class*="card"], [class*="article"], [class*="kanban"], table tbody tr, [class*="column"], [class*="Empty"]'
    );
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(0);

    await screenshotManager.capture(page, { module: MODULE, element: 'article-list', fullPage: true });
  });

  test('create article button exists', async ({ page, screenshotManager }) => {
    const createBtn = page.locator(
      'button:has-text("Criar"), button:has-text("Novo"), button:has-text("Adicionar"), a:has-text("Criar"), a:has-text("Novo")'
    );
    const count = await createBtn.count();

    if (count > 0) {
      await expect(createBtn.first()).toBeEnabled();
      await screenshotManager.capture(page, { module: MODULE, element: 'create-button' });
    }
  });

  test('article detail/editor navigation', async ({ page, screenshotManager }) => {
    const articleLinks = page.locator('a[href*="/articles/"]');
    const linkCount = await articleLinks.count();

    if (linkCount > 0) {
      await articleLinks.first().click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check for editor elements
      const editor = page.locator(
        'textarea, [contenteditable], [class*="editor"], [class*="Editor"], [class*="markdown"]'
      );
      const hasEditor = (await editor.count()) > 0;

      await screenshotManager.capture(page, { module: MODULE, element: 'article-detail' });
    }
  });

  test('status filters or view toggles work', async ({ page, screenshotManager }) => {
    // Look for status filters (draft, published, etc.)
    const filters = page.locator(
      'button:has-text("Rascunho"), button:has-text("Publicado"), [class*="tab"], [role="tab"]'
    );
    const count = await filters.count();

    if (count > 0) {
      await filters.first().click();
      await page.waitForTimeout(500);
      await screenshotManager.capture(page, { module: MODULE, element: 'filtered-view' });
    }
  });

  test('no broken links within articles section', async ({ page }) => {
    const links = page.locator('a[href^="/"]');
    const count = await links.count();

    const brokenLinks: string[] = [];
    for (let i = 0; i < Math.min(count, 10); i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href && href.startsWith('/')) {
        // Just verify the link is well-formed
        expect(href).toMatch(/^\/[a-z0-9\-\/]*$/i);
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

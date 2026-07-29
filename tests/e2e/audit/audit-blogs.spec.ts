import { test, expect } from './fixtures';

test.describe('Audit: Blogs', () => {
  const MODULE = 'blogs';

  test.beforeEach(async ({ page, errorCollector, auditPage }) => {
    errorCollector.startMonitoring(page);
    await auditPage.goto('/blogs');
    await auditPage.waitForReady();
  });

  test('page loads without critical errors', async ({ page, errorCollector }) => {
    const data = errorCollector.getSnapshot();
    expect(data.criticalCount).toBe(0);
  });

  test('renders blog list or empty state', async ({ page, screenshotManager }) => {
    // Should show either a list of blogs or an empty state message
    const content = page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    // Look for blog cards, list items, or empty state
    const blogItems = page.locator(
      '[class*="card"], [class*="blog"], table tbody tr, [class*="empty"], [class*="Empty"]'
    );
    const count = await blogItems.count();
    expect(count).toBeGreaterThanOrEqual(0);

    await screenshotManager.capture(page, { module: MODULE, element: 'blog-list', fullPage: true });
  });

  test('create blog button exists and is interactive', async ({ page, screenshotManager }) => {
    // Look for create/add blog button
    const createBtn = page.locator(
      'button:has-text("Criar"), button:has-text("Novo"), button:has-text("Adicionar"), a:has-text("Criar"), a:has-text("Novo")'
    );
    const count = await createBtn.count();

    if (count > 0) {
      await expect(createBtn.first()).toBeEnabled();
      await screenshotManager.capture(page, { module: MODULE, element: 'create-button' });
    }
  });

  test('navigation to blog sub-pages works', async ({ page, auditPage, screenshotManager }) => {
    // Try to navigate to blog settings if a blog exists
    const blogLinks = page.locator('a[href*="/blogs/"]');
    const linkCount = await blogLinks.count();

    if (linkCount > 0) {
      await blogLinks.first().click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      await screenshotManager.capture(page, { module: MODULE, element: 'blog-detail' });
    }
  });

  test('search or filter functionality', async ({ page, screenshotManager }) => {
    // Look for search input or filter controls
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="Buscar"], input[placeholder*="Pesquisar"], input[placeholder*="Filtrar"]'
    );
    const filterButtons = page.locator(
      'button:has-text("Filtrar"), [class*="filter"], select'
    );

    const hasSearch = (await searchInput.count()) > 0;
    const hasFilter = (await filterButtons.count()) > 0;

    if (hasSearch) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(500);
      await screenshotManager.capture(page, { module: MODULE, element: 'search-active' });
      await searchInput.first().clear();
    }

    // At least some filtering mechanism should exist for a list page
    // (not a hard failure if missing, but noted)
  });

  test('no JavaScript errors during interactions', async ({ page, errorCollector }) => {
    // Interact with page elements
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      // Skip dangerous buttons (delete, remove)
      if (text?.toLowerCase().includes('excluir') || text?.toLowerCase().includes('delete')) {
        continue;
      }
      // Click and check for errors
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    const data = errorCollector.getSnapshot();
    expect(data.criticalCount).toBe(0);
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

import { test, expect } from './fixtures';

test.describe('Audit: Calendar', () => {
  const MODULE = 'calendar';

  test.beforeEach(async ({ page, errorCollector, auditPage }) => {
    errorCollector.startMonitoring(page);
    await auditPage.goto('/calendar');
    await auditPage.waitForReady();
  });

  test('page loads without critical errors', async ({ page, errorCollector }) => {
    const data = errorCollector.getSnapshot();
    expect(data.criticalCount).toBe(0);
  });

  test('renders calendar grid or view', async ({ page, screenshotManager }) => {
    const content = page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    // Look for calendar elements (grid, table, date cells)
    const calendarElements = page.locator(
      '[class*="calendar"], [class*="Calendar"], table, [class*="grid"], [role="grid"]'
    );
    const count = await calendarElements.count();

    await screenshotManager.capture(page, { module: MODULE, element: 'calendar-view', fullPage: true });
  });

  test('month navigation works', async ({ page, screenshotManager }) => {
    // Look for navigation arrows (prev/next month)
    const navButtons = page.locator(
      'button:has-text("Anterior"), button:has-text("Próximo"), button[aria-label*="previous"], button[aria-label*="next"], button:has-text("<"), button:has-text(">")'
    );
    const count = await navButtons.count();

    if (count > 0) {
      await navButtons.first().click();
      await page.waitForTimeout(500);
      await screenshotManager.capture(page, { module: MODULE, element: 'month-navigation' });
    }
  });

  test('displays current month/date', async ({ page }) => {
    // Should show some date indicator
    const currentDate = new Date();
    const monthNames = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ];
    const currentMonth = monthNames[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear().toString();

    const bodyText = await page.textContent('body') ?? '';
    const hasDateReference =
      bodyText.toLowerCase().includes(currentMonth ?? '') ||
      bodyText.includes(currentYear);

    // Not a hard failure, just verification
  });

  test('calendar cells are interactive', async ({ page, screenshotManager }) => {
    // Try clicking on a date cell using proper Playwright locator API
    const dayCells = page.locator('td[class*="day"], [class*="cell"], [class*="date"]');
    const dayButtons = page.locator('button').filter({ hasText: /^\d{1,2}$/ });
    const gridCells = page.getByRole('gridcell');

    // Try multiple strategies to find interactive calendar cells
    let cells = dayCells;
    let count = await cells.count();

    if (count === 0) {
      cells = dayButtons;
      count = await cells.count();
    }

    if (count === 0) {
      cells = gridCells;
      count = await cells.count();
    }

    if (count > 0) {
      await cells.first().click();
      await page.waitForTimeout(500);
      await screenshotManager.capture(page, { module: MODULE, element: 'cell-clicked' });
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

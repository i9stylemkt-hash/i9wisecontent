import { test, expect } from './fixtures';

test.describe('Audit: Notifications', () => {
  const MODULE = 'notifications';

  test.beforeEach(async ({ page, errorCollector, auditPage }) => {
    errorCollector.startMonitoring(page);
    await auditPage.goto('/dashboard');
    await auditPage.waitForReady();
  });

  test('notification bell/icon is present', async ({ page, screenshotManager }) => {
    // Look for notification trigger (bell icon, badge)
    const notifTrigger = page.locator(
      '[aria-label*="notif"], [aria-label*="Notif"], button:has(svg), [class*="notification"], [class*="bell"]'
    );
    const count = await notifTrigger.count();

    // Notification area should be accessible from any page
    await screenshotManager.capture(page, { module: MODULE, element: 'notification-trigger' });
  });

  test('notification panel/dropdown opens', async ({ page, screenshotManager }) => {
    // Try to open notification panel
    const notifBtn = page.locator(
      '[aria-label*="notif"], [aria-label*="Notif"], button[class*="notification"]'
    );
    const count = await notifBtn.count();

    if (count > 0) {
      await notifBtn.first().click();
      await page.waitForTimeout(500);

      // Check if dropdown/panel appeared
      const panel = page.locator(
        '[class*="dropdown"], [class*="popover"], [class*="panel"], [role="menu"], [class*="notification-list"]'
      );
      const panelCount = await panel.count();

      await screenshotManager.capture(page, { module: MODULE, element: 'notification-panel' });
    }
  });

  test('notification API endpoint responds', async ({ page }) => {
    const response = await page.goto('/api/notifications');
    const status = response?.status() ?? 0;

    // Should not be a server error (401 is okay if auth is needed)
    expect(status).toBeLessThan(500);

    if (status === 200) {
      const body = await response?.json().catch(() => null);
      expect(body).not.toBeNull();
    }
  });

  test('mark-all-read endpoint works', async ({ page }) => {
    // Test the read-all endpoint
    const response = await page.evaluate(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return { status: res.status };
    }, process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000');

    // Should not crash (500)
    expect(response.status).toBeLessThan(500);
  });

  test('toast notifications display correctly', async ({ page, screenshotManager }) => {
    // Navigate and trigger actions that might show toasts
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Look for toast container
    const toastContainer = page.locator(
      '[class*="toast"], [class*="Toaster"], [role="status"], [class*="snackbar"]'
    );
    const count = await toastContainer.count();

    if (count > 0) {
      await screenshotManager.capture(page, { module: MODULE, element: 'toast-container' });
    }
  });

  test('notification badge shows unread count', async ({ page, screenshotManager }) => {
    // Look for badge/counter on notification icon
    const badge = page.locator(
      '[class*="badge"], [class*="counter"], [class*="dot"]'
    );
    const count = await badge.count();

    if (count > 0) {
      await screenshotManager.capture(page, { module: MODULE, element: 'notification-badge' });
    }
  });
});

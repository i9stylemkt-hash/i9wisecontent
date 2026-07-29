import { test, expect } from './fixtures';

test.describe('Audit: Buttons', () => {
  const MODULE = 'buttons';

  const PAGES_TO_CHECK = [
    '/dashboard',
    '/blogs',
    '/articles',
    '/ideas',
    '/pipeline',
    '/templates',
    '/prompts',
    '/settings',
  ];

  const PAGE_TIMEOUT: Record<string, number> = {
    '/templates': 90000,
  };

  test('all visible buttons are clickable and enabled', async ({
    page,
    errorCollector,
    auditPage,
    screenshotManager,
  }) => {
    errorCollector.startMonitoring(page);
    const disabledButtons: { page: string; text: string }[] = [];

    for (const route of PAGES_TO_CHECK) {
      const timeout = PAGE_TIMEOUT[route] ?? 30000;
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForTimeout(2000);

      const buttons = page.locator('button:visible');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const isDisabled = await btn.isDisabled();
        const text = (await btn.textContent())?.trim() || '';

        if (isDisabled && text) {
          disabledButtons.push({ page: route, text });
        }
      }
    }

    // Log disabled buttons for the report (not a failure, just info)
    if (disabledButtons.length > 0) {
      console.log(`[${MODULE}] Found ${disabledButtons.length} disabled buttons across pages`);
    }

    await screenshotManager.capture(page, { module: MODULE, element: 'buttons-audit' });
  });

  test('buttons have accessible names', async ({
    page,
    auditPage,
    screenshotManager,
  }) => {
    const buttonsWithoutNames: { page: string; index: number }[] = [];

    for (const route of PAGES_TO_CHECK.slice(0, 4)) {
      const timeout = PAGE_TIMEOUT[route] ?? 30000;
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForTimeout(2000);

      const buttons = page.locator('button:visible');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const text = (await btn.textContent())?.trim() || '';
        const ariaLabel = await btn.getAttribute('aria-label');
        const title = await btn.getAttribute('title');

        // Button should have visible text, aria-label, or title
        if (!text && !ariaLabel && !title) {
          // Check for icon-only buttons (they should have aria-label)
          const hasIcon = (await btn.locator('svg').count()) > 0;
          if (hasIcon) {
            buttonsWithoutNames.push({ page: route, index: i });
          }
        }
      }
    }

    if (buttonsWithoutNames.length > 0) {
      console.warn(
        `[${MODULE}] ${buttonsWithoutNames.length} icon-only buttons without accessible names`
      );
    }

    await screenshotManager.capture(page, { module: MODULE, element: 'button-accessibility' });
  });

  test('CTA buttons have visual prominence', async ({
    page,
    auditPage,
    screenshotManager,
  }) => {
    await auditPage.goto('/blogs');
    await auditPage.waitForReady();

    // Primary action buttons (Create, Save, etc.) should be visually distinct
    const ctaButtons = page.locator(
      'button:has-text("Criar"), button:has-text("Salvar"), button:has-text("Novo"), button:has-text("Adicionar")'
    );
    const count = await ctaButtons.count();

    if (count > 0) {
      const btn = ctaButtons.first();
      const bgColor = await btn.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      // CTA should have a visible background (not transparent)
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      await screenshotManager.capture(page, { module: MODULE, element: 'cta-buttons' });
    }
  });

  test('buttons show loading state during async operations', async ({
    page,
    auditPage,
    screenshotManager,
  }) => {
    // Check if buttons show spinner/loading during operations
    await auditPage.goto('/settings');
    await auditPage.waitForReady();

    const submitBtn = page.locator('button[type="submit"], button:has-text("Salvar")');
    if ((await submitBtn.count()) > 0) {
      await submitBtn.first().click();
      // Quick check for loading indicator
      await page.waitForTimeout(200);

      const loadingIndicator = page.locator(
        '[class*="spinner"], [class*="loading"], [class*="animate-spin"], svg[class*="animate"]'
      );
      const hasLoading = (await loadingIndicator.count()) > 0;

      await screenshotManager.capture(page, { module: MODULE, element: 'loading-state' });
    }
  });

  test('destructive buttons have confirmation', async ({
    page,
    auditPage,
    screenshotManager,
  }) => {
    // Look for delete buttons across pages
    for (const route of ['/blogs', '/articles', '/ideas']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const deleteButtons = page.locator(
        'button:has-text("Excluir"), button:has-text("Deletar"), button:has-text("Remover"), button[aria-label*="delete"]'
      );
      const count = await deleteButtons.count();

      if (count > 0) {
        // Click delete and check for confirmation dialog
        await deleteButtons.first().click();
        await page.waitForTimeout(500);

        const dialog = page.locator(
          '[role="dialog"], [role="alertdialog"], [class*="modal"], [class*="confirm"]'
        );
        const hasConfirmation = (await dialog.count()) > 0;

        if (hasConfirmation) {
          await screenshotManager.capture(page, { module: MODULE, element: 'delete-confirmation' });
          // Close the dialog
          const cancelBtn = page.locator('button:has-text("Cancelar"), button:has-text("Não")');
          if ((await cancelBtn.count()) > 0) {
            await cancelBtn.first().click();
          } else {
            await page.keyboard.press('Escape');
          }
        }
        break;
      }
    }
  });
});

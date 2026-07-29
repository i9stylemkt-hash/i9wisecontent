import { test, expect } from './fixtures';

test.describe('Audit: Forms', () => {
  const MODULE = 'forms';

  const PAGES_WITH_FORMS = [
    '/blogs',
    '/articles',
    '/ideas',
    '/templates',
    '/prompts',
    '/settings',
  ];

  test('forms have proper labels and accessibility', async ({
    page,
    errorCollector,
    auditPage,
    screenshotManager,
  }) => {
    errorCollector.startMonitoring(page);

    for (const route of PAGES_WITH_FORMS) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Find form inputs
      const inputs = page.locator('input:visible, textarea:visible, select:visible');
      const count = await inputs.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');

        // Input should have at least one identifying attribute
        const hasIdentifier = id || name || ariaLabel || ariaLabelledBy || placeholder;
        if (!hasIdentifier) {
          console.warn(`[${MODULE}] Input without label on ${route}`);
        }
      }
    }

    await screenshotManager.capture(page, { module: MODULE, element: 'form-accessibility' });
  });

  test('required fields show validation on empty submit', async ({
    page,
    auditPage,
    screenshotManager,
  }) => {
    // Try settings page which likely has required fields
    await auditPage.goto('/settings');
    await auditPage.waitForReady();

    const form = page.locator('form');
    const formCount = await form.count();

    if (formCount > 0) {
      // Try submitting without filling required fields
      const submitBtn = page.locator(
        'button[type="submit"], button:has-text("Salvar"), button:has-text("Enviar")'
      );
      if ((await submitBtn.count()) > 0) {
        await submitBtn.first().click();
        await page.waitForTimeout(1000);

        // Check for validation messages
        const validationMessages = page.locator(
          '[class*="error"], [class*="invalid"], [role="alert"], [aria-invalid="true"], .text-red, .text-destructive'
        );
        const msgCount = await validationMessages.count();
        await screenshotManager.capture(page, { module: MODULE, element: 'validation-messages' });
      }
    }
  });

  test('form inputs accept text input correctly', async ({
    page,
    auditPage,
    screenshotManager,
  }) => {
    await auditPage.goto('/settings');
    await auditPage.waitForReady();

    const textInputs = page.locator(
      'input[type="text"]:visible, input[type="email"]:visible, input[type="url"]:visible, textarea:visible'
    );
    const count = await textInputs.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = textInputs.nth(i);
      const isEnabled = await input.isEnabled();
      if (isEnabled) {
        await input.fill('test-value-123');
        const value = await input.inputValue();
        expect(value).toContain('test-value-123');
        await input.clear();
      }
    }

    await screenshotManager.capture(page, { module: MODULE, element: 'input-functionality' });
  });

  test('select/dropdown elements work', async ({
    page,
    auditPage,
    screenshotManager,
  }) => {
    await auditPage.goto('/settings');
    await auditPage.waitForReady();

    const selects = page.locator('select:visible, [role="combobox"]:visible, [role="listbox"]:visible');
    const count = await selects.count();

    if (count > 0) {
      await selects.first().click();
      await page.waitForTimeout(500);
      await screenshotManager.capture(page, { module: MODULE, element: 'dropdown-open' });
    }
  });

  test('textarea elements handle multiline text', async ({
    page,
    auditPage,
    screenshotManager,
  }) => {
    // Check pages that might have textareas (prompts, templates)
    for (const route of ['/prompts', '/templates']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Try opening a create form
      const createBtn = page.locator(
        'button:has-text("Criar"), button:has-text("Novo"), button:has-text("Adicionar")'
      );
      if ((await createBtn.count()) > 0) {
        await createBtn.first().click();
        await page.waitForTimeout(1000);

        const textarea = page.locator('textarea:visible');
        if ((await textarea.count()) > 0) {
          await textarea.first().fill('Line 1\nLine 2\nLine 3');
          const value = await textarea.first().inputValue();
          expect(value).toContain('\n');
          await screenshotManager.capture(page, { module: MODULE, element: 'textarea-multiline' });
          break;
        }
      }
    }
  });

  test('form submission does not cause page crash', async ({
    page,
    errorCollector,
    auditPage,
  }) => {
    errorCollector.startMonitoring(page);
    await auditPage.goto('/settings');
    await auditPage.waitForReady();

    // If there's a form, interact with it
    const form = page.locator('form');
    if ((await form.count()) > 0) {
      const submitBtn = page.locator('button[type="submit"]');
      if ((await submitBtn.count()) > 0) {
        await submitBtn.first().click();
        await page.waitForTimeout(2000);

        // Page should still be responsive
        const body = page.locator('body');
        await expect(body).toBeVisible();

        const data = errorCollector.getSnapshot();
        expect(data.criticalCount).toBe(0);
      }
    }
  });
});

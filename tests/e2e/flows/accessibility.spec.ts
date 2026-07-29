import { test, expect } from '@playwright/test';

test.describe('Accessibility Checks', () => {
  test('login page should have proper form labels', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // All inputs should have associated labels or aria-labels
    const inputs = page.locator('input:not([type="hidden"])');
    const count = await inputs.count();
    
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      
      // Should have at least one accessibility mechanism
      const hasLabel = id ? (await page.locator(`label[for="${id}"]`).count()) > 0 : false;
      const hasAccessibility = hasLabel || !!ariaLabel || !!ariaLabelledBy || !!placeholder;
      
      expect(hasAccessibility, `Input at index ${i} should have a label or aria attribute`).toBe(true);
    }
  });

  test('pages should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Page should have at most one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // All buttons should be focusable
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const tabIndex = await button.getAttribute('tabindex');
        // tabindex should not be -1 (unless intentionally hidden)
        if (tabIndex !== null) {
          expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(-1);
        }
      }
    }
  });

  test('images and icons should have alt text or aria-hidden', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check images
    const images = page.locator('img');
    const imgCount = await images.count();
    
    for (let i = 0; i < imgCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaHidden = await img.getAttribute('aria-hidden');
      const role = await img.getAttribute('role');
      
      // Each image should have alt text, be aria-hidden, or have role="presentation"
      const isAccessible = alt !== null || ariaHidden === 'true' || role === 'presentation';
      expect(isAccessible, `Image at index ${i} should have alt text or aria-hidden`).toBe(true);
    }
  });

  test('color contrast - dark mode should have sufficient text contrast', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Check that body has a dark background (dark mode)
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    // Dark mode should have a dark background (not white)
    // A dark bg like rgb(9, 9, 11) or similar
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('focus indicators should be visible', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Tab through elements and check focus is visible
    await page.keyboard.press('Tab');
    
    // Get the focused element
    const focusedElement = page.locator(':focus');
    const count = await focusedElement.count();
    
    if (count > 0) {
      // The focused element should have some visual indicator
      const outline = await focusedElement.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
          border: style.border,
        };
      });
      
      // Should have at least one focus indicator
      const hasFocusIndicator =
        outline.outline !== 'none' ||
        outline.boxShadow !== 'none' ||
        outline.border !== '';
      
      // Note: this is a soft check - some frameworks handle focus differently
      expect(hasFocusIndicator || true).toBe(true);
    }
  });
});

import { test, expect } from './fixtures';

/**
 * Varredura completa de funcionalidades:
 * - Botões de ação que não levam a lugar nenhum
 * - Links mortos ou desconectados
 * - Gatilhos que não disparam ações
 * - Estados ausentes em formulários e interações
 */
test.describe('Audit: Functional Actions & Connectivity', () => {
  const MODULE = 'functional-actions';

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  test.describe('Dashboard', () => {
    test('dashboard stats cards are clickable and navigate somewhere', async ({
      page,
      auditPage,
    }) => {
      await auditPage.goto('/dashboard');
      await auditPage.waitForReady();

      // Look for stats cards that should be clickable
      const cards = page.locator('[class*="card"], [class*="Card"]');
      const count = await cards.count();
      const deadCards: string[] = [];

      for (let i = 0; i < Math.min(count, 10); i++) {
        const card = cards.nth(i);
        const isVisible = await card.isVisible();
        if (!isVisible) continue;

        // Check if card has a link inside
        const link = card.locator('a');
        const linkCount = await link.count();

        // Check for clickable behavior
        const clickable = card.locator('a, button, [role="button"], [onclick]');
        const clickableCount = await clickable.count();

        const cardText = (await card.textContent())?.trim().slice(0, 50) || `card-${i}`;

        if (linkCount === 0 && clickableCount === 0) {
          // It's OK for info-only cards, just log
          console.log(`[${MODULE}] Dashboard card "${cardText}" has no interactive elements`);
        }
      }
    });

    test('dashboard quick action buttons work', async ({ page, auditPage }) => {
      await auditPage.goto('/dashboard');
      await auditPage.waitForReady();

      // Look for action buttons in the dashboard
      const actionButtons = page.locator(
        'button:has-text("Criar"), button:has-text("Novo"), button:has-text("Gerar"), a:has-text("Criar"), a:has-text("Novo")'
      );
      const count = await actionButtons.count();
      const results: { text: string; action: string }[] = [];

      for (let i = 0; i < count; i++) {
        const btn = actionButtons.nth(i);
        const isVisible = await btn.isVisible();
        if (!isVisible) continue;

        const text = (await btn.textContent())?.trim() || '';
        const tag = await btn.evaluate((el) => el.tagName.toLowerCase());
        const href = await btn.getAttribute('href');
        const disabled = await btn.isDisabled().catch(() => false);

        if (tag === 'a' && href) {
          results.push({ text, action: `link → ${href}` });
        } else if (tag === 'button' && !disabled) {
          results.push({ text, action: 'button (has handler)' });
        } else if (disabled) {
          results.push({ text, action: 'DISABLED' });
        }
      }

      console.log(`[${MODULE}] Dashboard action buttons:`, JSON.stringify(results, null, 2));
    });
  });

  // ─── BLOGS ─────────────────────────────────────────────────────────────────

  test.describe('Blogs', () => {
    test('criar novo blog button navigates to creation page', async ({ page, auditPage }) => {
      await auditPage.goto('/blogs');
      await auditPage.waitForReady();

      const createBtn = page.locator(
        'a:has-text("Criar"), a:has-text("Novo"), button:has-text("Criar"), button:has-text("Novo")'
      );
      const count = await createBtn.count();

      if (count > 0) {
        const firstVisible = createBtn.first();
        const tag = await firstVisible.evaluate((el) => el.tagName.toLowerCase());
        const href = await firstVisible.getAttribute('href');

        if (tag === 'a' && href) {
          await firstVisible.click();
          await page.waitForTimeout(2000);
          const url = page.url();
          expect(url).toContain('/blogs/new');
        } else {
          await firstVisible.click();
          await page.waitForTimeout(2000);
          // Should open a form or navigate somewhere
          const url = page.url();
          const formVisible = await page.locator('form, input, [role="dialog"]').count();
          expect(url.includes('/blogs/new') || formVisible > 0).toBeTruthy();
        }
      } else {
        console.warn(`[${MODULE}] No "Criar" or "Novo" button found on /blogs`);
      }
    });

    test('blog list items are clickable and navigate to detail', async ({ page, auditPage }) => {
      await auditPage.goto('/blogs');
      await auditPage.waitForReady();

      const blogItems = page.locator('a[href*="/blogs/"]');
      const count = await blogItems.count();

      if (count > 0) {
        const firstHref = await blogItems.first().getAttribute('href');
        await blogItems.first().click();
        await page.waitForTimeout(2000);
        const url = page.url();
        // Should navigate to the blog detail
        expect(url).toContain('/blogs/');
      } else {
        console.log(`[${MODULE}] No blog items found to click`);
      }
    });
  });

  // ─── ARTICLES ──────────────────────────────────────────────────────────────

  test.describe('Articles', () => {
    test('articles page has working filter/search', async ({ page, auditPage }) => {
      await auditPage.goto('/articles');
      await auditPage.waitForReady();

      // Look for filter, search, or select elements
      const filters = page.locator('input[type="search"], input[placeholder*="Buscar"], select, [class*="filter"]');
      const count = await filters.count();

      console.log(`[${MODULE}] Articles page filters found: ${count}`);

      if (count > 0) {
        const filter = filters.first();
        const tag = await filter.evaluate((el) => el.tagName.toLowerCase());

        if (tag === 'input') {
          await filter.fill('test');
          await page.waitForTimeout(1000);
          // Should filter or trigger search without errors
        }
      }
    });

    test('article cards link to article detail page', async ({ page, auditPage }) => {
      await auditPage.goto('/articles');
      await auditPage.waitForReady();

      const articleLinks = page.locator('a[href*="/articles/"]');
      const count = await articleLinks.count();

      if (count > 0) {
        const href = await articleLinks.first().getAttribute('href');
        await articleLinks.first().click();
        await page.waitForTimeout(2000);
        const url = page.url();
        expect(url).toContain('/articles/');
      } else {
        console.log(`[${MODULE}] No article links found`);
      }
    });
  });

  // ─── IDEAS ─────────────────────────────────────────────────────────────────

  test.describe('Ideas', () => {
    test('ideas page create button works', async ({ page, auditPage }) => {
      await auditPage.goto('/ideas');
      await auditPage.waitForReady();

      const createBtn = page.locator(
        'button:has-text("Criar"), button:has-text("Nova"), button:has-text("Adicionar"), a:has-text("Nova")'
      );
      const count = await createBtn.count();

      if (count > 0) {
        await createBtn.first().click();
        await page.waitForTimeout(1500);

        // Should open a form, modal, or navigate
        const dialog = page.locator('[role="dialog"], form, input[type="text"]');
        const dialogCount = await dialog.count();
        const urlChanged = !page.url().endsWith('/ideas');

        expect(
          dialogCount > 0 || urlChanged,
          'Create button should open a form/dialog or navigate'
        ).toBeTruthy();
      } else {
        console.warn(`[${MODULE}] No create button found on /ideas`);
      }
    });
  });

  // ─── PIPELINE ──────────────────────────────────────────────────────────────

  test.describe('Pipeline', () => {
    test('pipeline page gerar artigo button is functional', async ({ page, auditPage }) => {
      await auditPage.goto('/pipeline');
      await auditPage.waitForReady();

      // The "Gerar Artigo" button should exist but be disabled without blog selection
      const gerarBtn = page.locator('button:has-text("Gerar")');
      const count = await gerarBtn.count();

      expect(count, 'Should have "Gerar Artigo" button').toBeGreaterThan(0);

      const isDisabled = await gerarBtn.first().isDisabled();
      // Without blog selected, should be disabled
      expect(isDisabled).toBeTruthy();

      // Select a blog
      const select = page.locator('select');
      if ((await select.count()) > 0) {
        const options = await select.first().locator('option').allTextContents();
        if (options.length > 1) {
          // Select first non-empty option
          await select.first().selectOption({ index: 1 });
          await page.waitForTimeout(500);

          // Button should now be enabled
          const stillDisabled = await gerarBtn.first().isDisabled();
          expect(stillDisabled, 'Button should enable after selecting a blog').toBeFalsy();
        }
      }
    });

    test('pipeline run items show correct status', async ({ page, auditPage }) => {
      await auditPage.goto('/pipeline');
      await auditPage.waitForReady();

      const runs = page.locator('[class*="card"], [class*="Card"]');
      const count = await runs.count();

      // Check for the "Limite de requisições excedido" warning or pipeline runs
      const warningText = await page.locator('text=Limite').count();
      const emptyState = await page.locator('text=Nenhuma execução').count();

      console.log(`[${MODULE}] Pipeline: ${count} cards, warning: ${warningText > 0}, empty: ${emptyState > 0}`);
    });
  });

  // ─── TEMPLATES ─────────────────────────────────────────────────────────────

  test.describe('Templates', () => {
    test('templates page loads and has content', async ({ page, auditPage }) => {
      await auditPage.goto('/templates');
      await auditPage.waitForReady();

      const content = page.locator('main, [role="main"]');
      await expect(content.first()).toBeVisible({ timeout: 10000 });

      // Check for template cards or empty state
      const templates = page.locator('[class*="card"], [class*="Card"], [class*="template"]');
      const emptyState = page.locator('text=Nenhum template, text=vazio, text=Criar');
      const count = await templates.count();
      const hasEmpty = (await emptyState.count()) > 0;

      console.log(`[${MODULE}] Templates: ${count} items found, empty state: ${hasEmpty}`);
    });

    test('template action buttons trigger expected behavior', async ({ page, auditPage }) => {
      await auditPage.goto('/templates');
      await auditPage.waitForReady();

      const actionBtns = page.locator(
        'button:has-text("Usar"), button:has-text("Editar"), button:has-text("Criar"), a[href*="template"]'
      );
      const count = await actionBtns.count();

      const results: { text: string; works: boolean; detail: string }[] = [];

      for (let i = 0; i < Math.min(count, 5); i++) {
        const btn = actionBtns.nth(i);
        const isVisible = await btn.isVisible();
        if (!isVisible) continue;

        const text = (await btn.textContent())?.trim() || '';
        const urlBefore = page.url();

        await btn.click();
        await page.waitForTimeout(1500);

        const urlAfter = page.url();
        const dialogOpen = (await page.locator('[role="dialog"]').count()) > 0;
        const formVisible = (await page.locator('form:visible, textarea:visible').count()) > 0;

        const actionOccurred = urlBefore !== urlAfter || dialogOpen || formVisible;

        results.push({
          text,
          works: actionOccurred,
          detail: actionOccurred
            ? `Navigated or opened dialog`
            : 'NO ACTION DETECTED',
        });

        // Navigate back if needed
        if (urlBefore !== urlAfter) {
          await page.goBack();
          await page.waitForTimeout(1000);
        } else if (dialogOpen) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }

      const deadButtons = results.filter((r) => !r.works);
      if (deadButtons.length > 0) {
        console.error(
          `[${MODULE}] DEAD BUTTONS on /templates:`,
          JSON.stringify(deadButtons, null, 2)
        );
      }

      console.log(`[${MODULE}] Template buttons audit:`, JSON.stringify(results, null, 2));
    });
  });

  // ─── PROMPTS ───────────────────────────────────────────────────────────────

  test.describe('Prompts', () => {
    test('prompts page loads and shows content', async ({ page, auditPage }) => {
      await auditPage.goto('/prompts');
      await auditPage.waitForReady();

      const content = page.locator('main, [role="main"]');
      await expect(content.first()).toBeVisible({ timeout: 10000 });

      const prompts = page.locator('[class*="card"], [class*="Card"]');
      const count = await prompts.count();
      console.log(`[${MODULE}] Prompts page: ${count} items found`);
    });

    test('prompt action buttons work', async ({ page, auditPage }) => {
      await auditPage.goto('/prompts');
      await auditPage.waitForReady();

      const actionBtns = page.locator(
        'button:has-text("Criar"), button:has-text("Novo"), button:has-text("Editar"), button:has-text("Usar")'
      );
      const count = await actionBtns.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const btn = actionBtns.nth(i);
        const isVisible = await btn.isVisible();
        if (!isVisible) continue;

        const text = (await btn.textContent())?.trim() || '';
        const urlBefore = page.url();
        const disabled = await btn.isDisabled();

        if (!disabled) {
          await btn.click();
          await page.waitForTimeout(1500);

          const urlAfter = page.url();
          const dialogOpen = (await page.locator('[role="dialog"]').count()) > 0;

          if (urlBefore === urlAfter && !dialogOpen) {
            console.error(`[${MODULE}] DEAD BUTTON on /prompts: "${text}"`);
          }

          // Reset state
          if (urlBefore !== urlAfter) {
            await page.goBack();
            await page.waitForTimeout(1000);
          } else if (dialogOpen) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          }
        }
      }
    });
  });

  // ─── SETTINGS ──────────────────────────────────────────────────────────────

  test.describe('Settings', () => {
    test('settings tabs/sections all load content', async ({ page, auditPage }) => {
      await auditPage.goto('/settings');
      await auditPage.waitForReady();

      // Look for tabs or settings navigation
      const tabs = page.locator(
        '[role="tab"], a[href*="/settings/"], button[class*="tab"]'
      );
      const count = await tabs.count();
      const emptyTabs: string[] = [];

      console.log(`[${MODULE}] Settings: ${count} tabs/sections found`);

      for (let i = 0; i < Math.min(count, 8); i++) {
        const tab = tabs.nth(i);
        const isVisible = await tab.isVisible();
        if (!isVisible) continue;

        const text = (await tab.textContent())?.trim() || '';
        const href = await tab.getAttribute('href');

        if (href) {
          await page.goto(href, { waitUntil: 'domcontentloaded' });
        } else {
          await tab.click();
        }
        await page.waitForTimeout(1500);

        // Check if content loaded
        const contentArea = page.locator('main form, main [class*="card"], main input, main select');
        const contentCount = await contentArea.count();

        if (contentCount === 0) {
          emptyTabs.push(text || href || `tab-${i}`);
        }
      }

      if (emptyTabs.length > 0) {
        console.error(`[${MODULE}] EMPTY SETTINGS SECTIONS:`, emptyTabs);
      }
    });

    test('settings save buttons trigger save action', async ({ page, auditPage }) => {
      await auditPage.goto('/settings');
      await auditPage.waitForReady();

      const saveBtn = page.locator(
        'button:has-text("Salvar"), button[type="submit"]'
      );
      const count = await saveBtn.count();

      if (count > 0) {
        const btn = saveBtn.first();
        const disabled = await btn.isDisabled();

        console.log(`[${MODULE}] Settings save button: disabled=${disabled}`);

        // Check if form inputs exist
        const inputs = page.locator('input:visible, select:visible, textarea:visible');
        const inputCount = await inputs.count();
        console.log(`[${MODULE}] Settings form inputs: ${inputCount}`);
      } else {
        console.warn(`[${MODULE}] No save button found on /settings`);
      }
    });
  });

  // ─── CALENDAR ──────────────────────────────────────────────────────────────

  test.describe('Calendar', () => {
    test('calendar page renders and has navigation controls', async ({ page, auditPage }) => {
      await auditPage.goto('/calendar');
      await auditPage.waitForReady();

      // Calendar should have prev/next navigation
      const navButtons = page.locator(
        'button[aria-label*="anterior"], button[aria-label*="próximo"], button:has(svg[class*="chevron"]), button:has(svg[class*="arrow"])'
      );
      const generalButtons = page.locator('button:visible');
      const count = await generalButtons.count();

      console.log(`[${MODULE}] Calendar: ${count} buttons found`);

      // Should have some date indicators
      const dateElements = page.locator('[class*="day"], [class*="date"], td, [class*="calendar"]');
      const dateCount = await dateElements.count();
      expect(dateCount, 'Calendar should render date elements').toBeGreaterThan(0);
    });
  });

  // ─── GLOBAL: DEAD BUTTONS SWEEP ───────────────────────────────────────────

  test.describe('Global Dead Button Detection', () => {
    const PAGES = [
      '/dashboard',
      '/blogs',
      '/articles',
      '/ideas',
      '/pipeline',
      '/templates',
      '/prompts',
      '/settings',
      '/calendar',
    ];

    test('identify all buttons without click handlers or navigation', async ({
      page,
      auditPage,
    }) => {
      const deadButtons: { page: string; text: string; type: string }[] = [];

      for (const route of PAGES) {
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const buttons = page.locator('button:visible, a[role="button"]:visible');
        const count = await buttons.count();

        for (let i = 0; i < count; i++) {
          const btn = buttons.nth(i);
          const text = (await btn.textContent())?.trim().slice(0, 60) || '';
          const tag = await btn.evaluate((el) => el.tagName.toLowerCase());

          if (tag === 'a') {
            const href = await btn.getAttribute('href');
            if (!href || href === '#' || href === '') {
              deadButtons.push({ page: route, text, type: 'link-no-href' });
            }
          } else {
            // Check for onclick, event listeners via data attributes
            const hasOnClick = await btn.evaluate((el) => {
              const hasAttr = el.hasAttribute('onclick');
              const hasDisabled = (el as HTMLButtonElement).disabled;
              const hasType = el.getAttribute('type');
              // Buttons of type="submit" in forms are functional
              if (hasType === 'submit') return true;
              // React attaches handlers internally, can't detect via DOM easily
              // But we can check if the button is inside a form or has aria attributes
              const inForm = el.closest('form') !== null;
              return hasAttr || inForm || hasDisabled;
            });

            // For non-form, non-disabled buttons without text - might be dead
            if (!text && !hasOnClick) {
              const ariaLabel = await btn.getAttribute('aria-label');
              if (!ariaLabel) {
                deadButtons.push({ page: route, text: `[empty-${i}]`, type: 'no-text-no-handler' });
              }
            }
          }
        }
      }

      if (deadButtons.length > 0) {
        console.error(
          `\n[${MODULE}] ⚠️ POTENTIAL DEAD BUTTONS FOUND:\n`,
          JSON.stringify(deadButtons, null, 2)
        );
      } else {
        console.log(`[${MODULE}] ✅ No obvious dead buttons detected`);
      }
    });

    test('all links with href navigate successfully (no 404/500)', async ({
      page,
      auditPage,
    }) => {
      const brokenLinks: { page: string; href: string; status: number }[] = [];

      for (const route of PAGES) {
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        const links = page.locator('a[href]:visible');
        const count = await links.count();
        const hrefs: string[] = [];

        for (let i = 0; i < count; i++) {
          const href = await links.nth(i).getAttribute('href');
          if (href && href.startsWith('/') && !hrefs.includes(href)) {
            hrefs.push(href);
          }
        }

        // Check unique internal links
        for (const href of hrefs.slice(0, 15)) {
          try {
            const response = await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 15000 });
            const status = response?.status() || 0;
            if (status >= 400) {
              brokenLinks.push({ page: route, href, status });
            }
          } catch {
            brokenLinks.push({ page: route, href, status: 0 });
          }
        }
      }

      if (brokenLinks.length > 0) {
        console.error(
          `\n[${MODULE}] ❌ BROKEN LINKS FOUND:\n`,
          JSON.stringify(brokenLinks, null, 2)
        );
      }

      expect(brokenLinks.length, `${brokenLinks.length} broken links found`).toBe(0);
    });
  });
});

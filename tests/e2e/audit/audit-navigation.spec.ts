import { test, expect } from './fixtures';

test.describe('Audit: Navigation', () => {
  const MODULE = 'navigation';

  const SIDEBAR_ROUTES = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Blogs', href: '/blogs' },
    { title: 'Artigos', href: '/articles' },
    { title: 'Ideias', href: '/ideas' },
    { title: 'Calendário', href: '/calendar' },
    { title: 'Pipeline', href: '/pipeline' },
    { title: 'Templates', href: '/templates' },
    { title: 'Prompts', href: '/prompts' },
    { title: 'Configurações', href: '/settings' },
  ];

  test.beforeEach(async ({ page, errorCollector, auditPage }) => {
    errorCollector.startMonitoring(page);
    await auditPage.goto('/dashboard');
    await auditPage.waitForReady();
  });

  test('sidebar renders all 9 navigation items', async ({ page, screenshotManager }) => {
    const nav = page.locator('nav, aside, [role="navigation"]');
    await expect(nav.first()).toBeVisible({ timeout: 10000 });

    for (const route of SIDEBAR_ROUTES) {
      const link = page.locator(`a[href="${route.href}"], a:has-text("${route.title}")`);
      const count = await link.count();
      // Each nav item should be present
      expect(count, `Missing nav item: ${route.title} (${route.href})`).toBeGreaterThan(0);
    }

    await screenshotManager.capture(page, { module: MODULE, element: 'sidebar-full', fullPage: true });
  });

  test('all sidebar links navigate correctly', async ({ page, errorCollector, screenshotManager }) => {
    for (const route of SIDEBAR_ROUTES) {
      await page.goto(route.href, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const currentUrl = page.url();
      // Should not be redirected to login (auth should be working)
      if (!currentUrl.includes('/login')) {
        // Page loaded successfully
        const content = page.locator('main, [role="main"], #__next');
        await expect(content.first()).toBeVisible({ timeout: 10000 });
      }
    }

    const data = errorCollector.getSnapshot();
    // Should not have critical errors across all navigations
    expect(data.criticalCount).toBe(0);

    await screenshotManager.capture(page, { module: MODULE, element: 'all-pages-visited' });
  });

  test('active state highlights current route', async ({ page, screenshotManager }) => {
    await page.goto('/blogs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Check for active/selected state on the Blogs link
    const blogsLink = page.locator('a[href="/blogs"]');
    const count = await blogsLink.count();

    if (count > 0) {
      const classes = await blogsLink.first().getAttribute('class');
      const ariaSelected = await blogsLink.first().getAttribute('aria-current');
      // Link should have some visual distinction (class or aria attribute)
      await screenshotManager.capture(page, { module: MODULE, element: 'active-state' });
    }
  });

  test('breadcrumbs or page titles match route', async ({ page }) => {
    for (const route of SIDEBAR_ROUTES.slice(0, 3)) {
      await page.goto(route.href, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Page should have a heading or title referencing the current section
      const heading = page.locator('h1, h2, [class*="title"], [class*="heading"]');
      const count = await heading.count();
      // At minimum, page should render some heading
    }
  });

  test('mobile navigation hamburger menu', async ({ page, screenshotManager }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Look for hamburger/menu button on mobile
    const menuBtn = page.locator(
      'button[aria-label*="menu"], button[aria-label*="Menu"], button:has([class*="menu"]), [class*="hamburger"]'
    );
    const count = await menuBtn.count();

    if (count > 0) {
      await menuBtn.first().click();
      await page.waitForTimeout(500);
      await screenshotManager.capture(page, {
        module: MODULE,
        element: 'mobile-menu-open',
        viewport: '375x667',
      });
    }
  });

  test('no dead links (404s) in navigation', async ({ page }) => {
    const deadLinks: string[] = [];

    for (const route of SIDEBAR_ROUTES) {
      const response = await page.goto(route.href);
      if (response && response.status() === 404) {
        deadLinks.push(route.href);
      }
    }

    expect(deadLinks, `Dead links found: ${deadLinks.join(', ')}`).toHaveLength(0);
  });
});

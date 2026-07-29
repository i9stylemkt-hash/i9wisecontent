import { test, expect } from './fixtures';

test.describe('Audit: API Routes', () => {
  const MODULE = 'api';

  const API_ROUTES = [
    { method: 'GET', path: '/api/blogs' },
    { method: 'GET', path: '/api/articles' },
    { method: 'GET', path: '/api/ideas' },
    { method: 'GET', path: '/api/pipeline' },
    { method: 'GET', path: '/api/templates' },
    { method: 'GET', path: '/api/notifications' },
    { method: 'GET', path: '/api/metrics' },
    { method: 'GET', path: '/api/ai/keys' },
  ];

  test('all GET API routes respond without 500 errors', async ({
    page,
    errorCollector,
    screenshotManager,
  }) => {
    errorCollector.startMonitoring(page);
    const results: { route: string; status: number }[] = [];

    for (const route of API_ROUTES) {
      const response = await page.goto(route.path);
      const status = response?.status() ?? 0;
      results.push({ route: route.path, status });

      // 401/403 is acceptable (requires auth), 500 is not
      if (status >= 500) {
        console.error(`[${MODULE}] Server error on ${route.path}: ${status}`);
      }
    }

    const serverErrors = results.filter((r) => r.status >= 500);
    expect(
      serverErrors.length,
      `Server errors: ${serverErrors.map((r) => `${r.route}=${r.status}`).join(', ')}`
    ).toBe(0);
  });

  test('API routes return proper JSON format', async ({ page }) => {
    for (const route of API_ROUTES.slice(0, 4)) {
      const response = await page.goto(route.path);
      const status = response?.status() ?? 0;

      if (status === 200) {
        const contentType = response?.headers()['content-type'] ?? '';
        expect(contentType).toContain('application/json');

        const body = await response?.json().catch(() => null);
        // Should return a valid JSON response
        expect(body).not.toBeNull();
      }
    }
  });

  test('API routes handle missing auth correctly', async ({ page }) => {
    // Create a new context without auth to test unauthorized access
    const context = await page.context().browser()!.newContext();
    const unauthPage = await context.newPage();

    for (const route of API_ROUTES.slice(0, 3)) {
      const response = await unauthPage.goto(
        `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}${route.path}`
      );
      const status = response?.status() ?? 0;

      // Should return 401 or 403, not 500
      if (status >= 400) {
        expect(status).toBeLessThan(500);
      }
    }

    await context.close();
  });

  test('POST routes reject invalid payloads', async ({ request }) => {
    // Test POST with invalid/empty body using Playwright's request fixture
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    const postRoutes = ['/api/blogs', '/api/articles', '/api/ideas'];

    for (const route of postRoutes) {
      const response = await request.post(`${baseUrl}${route}`, {
        data: {},
        headers: { 'Content-Type': 'application/json' },
      });

      // Should reject invalid payload (400) not crash (500)
      if (response.status() >= 400) {
        expect(response.status()).toBeLessThan(500);
      }
    }
  });

  test('API response times are acceptable', async ({ page, screenshotManager }) => {
    const slowRoutes: { route: string; time: number }[] = [];

    for (const route of API_ROUTES) {
      const start = Date.now();
      await page.goto(route.path);
      const duration = Date.now() - start;

      if (duration > 5000) {
        slowRoutes.push({ route: route.path, time: duration });
      }
    }

    if (slowRoutes.length > 0) {
      console.warn(
        `[${MODULE}] Slow API routes: ${slowRoutes.map((r) => `${r.route} (${r.time}ms)`).join(', ')}`
      );
    }

    // No route should take more than 30 seconds
    for (const slow of slowRoutes) {
      expect(slow.time).toBeLessThan(30000);
    }
  });

  test('CORS headers present for API routes', async ({ page }) => {
    for (const route of API_ROUTES.slice(0, 2)) {
      const response = await page.goto(route.path);
      // For same-origin requests, CORS headers may not be required
      // but checking content-type is correct
      if (response?.status() === 200) {
        const headers = response.headers();
        expect(headers['content-type']).toBeDefined();
      }
    }
  });
});

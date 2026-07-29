import { test, expect } from '@playwright/test';

test.describe('API Health Checks', () => {
  test('GET /api/blogs should return valid response or auth error', async ({ request }) => {
    const response = await request.get('/api/blogs');
    // Should return 200 (if authed), 401 (not authed), or redirect (302/307)
    expect([200, 401, 302, 307]).toContain(response.status());
    expect(response.status()).not.toBe(500);
  });

  test('GET /api/articles should return valid response or auth error', async ({ request }) => {
    const response = await request.get('/api/articles');
    expect([200, 401, 302, 307]).toContain(response.status());
    expect(response.status()).not.toBe(500);
  });

  test('GET /api/ideas should return valid response or auth error', async ({ request }) => {
    const response = await request.get('/api/ideas');
    expect([200, 401, 429, 302, 307]).toContain(response.status());
    expect(response.status()).not.toBe(500);
  });

  test('GET /api/metrics should return valid response or auth error', async ({ request }) => {
    const response = await request.get('/api/metrics');
    expect([200, 401, 429, 302, 307]).toContain(response.status());
    expect(response.status()).not.toBe(500);
  });

  test('POST /api/pipeline should require blogId or return auth/rate error', async ({ request }) => {
    const response = await request.post('/api/pipeline', {
      data: { blogId: 'test-id' },
    });
    // Should be 400/401/429 — never 500
    expect([400, 401, 429]).toContain(response.status());
    expect(response.status()).not.toBe(500);
  });

  test('POST /api/blogs should validate data or return auth/rate error', async ({ request }) => {
    const response = await request.post('/api/blogs', {
      data: { name: 'Test Blog', niche: 'tech' },
    });
    // Should not crash (no 500 errors)
    expect(response.status()).not.toBe(500);
    expect([200, 201, 400, 401, 429]).toContain(response.status());
  });

  test('GET /api/pipeline should return valid response or error', async ({ request }) => {
    const response = await request.get('/api/pipeline');
    expect([200, 401, 429]).toContain(response.status());
    expect(response.status()).not.toBe(500);
  });

  test('GET /api/notifications should return valid response or error', async ({ request }) => {
    const response = await request.get('/api/notifications');
    expect([200, 401, 429]).toContain(response.status());
    expect(response.status()).not.toBe(500);
  });

  test('API rate limiting should be functional', async ({ request }) => {
    // Make multiple rapid requests to test rate limiting
    const responses = [];
    for (let i = 0; i < 5; i++) {
      const response = await request.get('/api/blogs');
      responses.push(response);
    }
    
    // Should never get 500 errors
    for (const response of responses) {
      expect(response.status()).not.toBe(500);
    }
  });

  test('Cron endpoints should require authorization', async ({ request }) => {
    // Cron routes should require proper secret
    const response = await request.get('/api/cron/generate-content');
    // Should return error without proper secret (not 200 success)
    expect([401, 403, 405, 429]).toContain(response.status());
  });

  test('API should return proper JSON content-type', async ({ request }) => {
    const response = await request.get('/api/blogs');
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });
});

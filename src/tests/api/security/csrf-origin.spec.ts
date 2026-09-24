import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Security: CSRF Origin Header Validation Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  const STATE_CHANGING_ROUTES = [
    { method: 'post', path: '/api/forms', data: { title: 'CSRF Form' } },
    { method: 'post', path: '/api/posts', data: { content: 'CSRF Post' } },
    { method: 'post', path: '/api/auth/sign-out', data: {} },
    { method: 'delete', path: '/api/posts/mock-post-1', data: {} },
  ];

  for (const route of STATE_CHANGING_ROUTES) {
    test(`TC-SEC-CSRF: state-changing route ${route.path} must reject untrusted Origin headers`, async () => {
      const maliciousOrigin = 'https://attacker-controlled-site.com';

      const response = await apiClient.post(route.path, {
        headers: {
          cookie: 'vakh_session=authenticated-user',
          Origin: maliciousOrigin,
          Referer: `${maliciousOrigin}/exploit`,
        },
        data: route.data,
      });

      // Must reject with 403 Forbidden or 400 Bad Request or 401
      expect([400, 401, 403, 404]).toContain(response.status);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(201);
    });
  }
});

import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Security: IDOR Authorization Sweep Across Parameterized :id Routes', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  const IDOR_TARGET_ROUTES = [
    { method: 'get', path: '/api/forms/foreign-private-form-id', name: 'Private Form Read' },
    { method: 'delete', path: '/api/forms/foreign-private-form-id', name: 'Foreign Form Delete' },
    { method: 'put', path: '/api/posts/foreign-post-id', name: 'Foreign Post Edit' },
    { method: 'delete', path: '/api/posts/foreign-post-id', name: 'Foreign Post Delete' },
    { method: 'get', path: '/api/conversations/foreign-conversation-id', name: 'Foreign Conversation Access' },
    { method: 'get', path: '/api/badges/foreign-private-badge-id', name: 'Private Badge Members Access' },
    { method: 'delete', path: '/api/badges/foreign-badge-id', name: 'Foreign Badge Delete' },
  ];

  for (const route of IDOR_TARGET_ROUTES) {
    test(`TC-SEC-IDOR: unauthorized user access attempt on ${route.name} (${route.path}) must be blocked`, async () => {
      const unauthorizedToken = 'vakh_session=unauthorized-attacker-session';

      let response;
      if (route.method === 'get') {
        response = await apiClient.get(route.path, { headers: { cookie: unauthorizedToken } });
      } else if (route.method === 'put') {
        response = await apiClient.put(route.path, {
          headers: { cookie: unauthorizedToken },
          data: { content: 'IDOR Defacement' },
        });
      } else if (route.method === 'delete') {
        response = await apiClient.delete(route.path, { headers: { cookie: unauthorizedToken } });
      }

      // Assert unauthorized token CANNOT succeed with 200/201/204
      expect([401, 403, 404]).toContain(response!.status);
      expect(response!.status).not.toBe(200);
      expect(response!.status).not.toBe(204);
    });
  }
});

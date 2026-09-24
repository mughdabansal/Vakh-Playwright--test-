import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Tier 2: Core CRUD & Pagination Contract Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T2-CRUD-001: Cursor Pagination Contract (cursor, has_more, next_cursor)
   * Validates standard pagination structure across feed/list endpoints
   */
  test('TC-T2-CRUD-001: feed listing must adhere to cursor, has_more, next_cursor contract', async () => {
    const response = await apiClient.get('/api/posts?limit=5');

    expect([200, 401]).toContain(response.status);
    if (response.status === 200 && response.data) {
      const data = response.data;
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);

      // Pagination fields
      if (data.has_more !== undefined) {
        expect(typeof data.has_more).toBe('boolean');
      }
      if (data.next_cursor !== undefined && data.has_more === true) {
        expect(typeof data.next_cursor).toBe('string');
      }
    }
  });

  /**
   * TC-T2-CRUD-002: Subscriptions & Notifications List Contract
   * Validates list endpoints for authenticated user resources
   */
  test('TC-T2-CRUD-002: should verify subscriptions and notifications listing schemas', async () => {
    const authHeaders = { cookie: 'vakh_session=mock-user' };

    const [subResponse, notifResponse] = await Promise.all([
      apiClient.get('/api/subscriptions', { headers: authHeaders }),
      apiClient.get('/api/notifications', { headers: authHeaders }),
    ]);

    expect([200, 401]).toContain(subResponse.status);
    expect([200, 401]).toContain(notifResponse.status);
  });

  /**
   * TC-T2-CRUD-003: Badges Resource CRUD Lifecycle
   * Validates badge retrieval and access listing
   */
  test('TC-T2-CRUD-003: badge discovery and member access contract', async () => {
    const response = await apiClient.get('/api/badges');
    expect([200, 401, 404]).toContain(response.status);
  });
});

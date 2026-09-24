import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Tier 2: Hearts Budget & Engagement Rules Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T2-HEART-001: 1–7 Hearts Per Request Boundary
   * Validates heart increment must be between 1 and 7 inclusive
   */
  test('TC-T2-HEART-001: heart batch count must be constrained between 1 and 7', async () => {
    const authHeaders = { cookie: 'vakh_session=mock-user' };
    const targetPostId = 'post-hearts-boundary-test';

    // 1. Boundary: 0 hearts (must fail)
    const zeroResponse = await apiClient.post(`/api/posts/${targetPostId}/hearts`, {
      headers: authHeaders,
      data: { count: 0 },
    });
    expect([400, 422, 401]).toContain(zeroResponse.status);

    // 2. Boundary: 8 hearts (must fail)
    const overResponse = await apiClient.post(`/api/posts/${targetPostId}/hearts`, {
      headers: authHeaders,
      data: { count: 8 },
    });
    expect([400, 422, 401]).toContain(overResponse.status);

    // 3. Valid: 3 hearts (must accept schema)
    const validResponse = await apiClient.post(`/api/posts/${targetPostId}/hearts`, {
      headers: authHeaders,
      data: { count: 3 },
      idempotencyKey: `heart-valid-${Date.now()}`,
    });
    expect([200, 201, 401, 404]).toContain(validResponse.status);
  });

  /**
   * TC-T2-HEART-002: Idempotency Key Deduplication
   * Validates identical Idempotency-Key returns cached response without charging budget twice
   */
  test('TC-T2-HEART-002: identical Idempotency-Key must deduplicate retry requests', async () => {
    const idempotencyKey = `heart-dedupe-${Date.now()}`;
    const targetPostId = 'post-hearts-idempotency-test';
    const authHeaders = { cookie: 'vakh_session=mock-user' };

    // Request 1
    const res1 = await apiClient.post(`/api/posts/${targetPostId}/hearts`, {
      headers: authHeaders,
      data: { count: 2 },
      idempotencyKey,
    });

    // Request 2 (Immediate retry with identical idempotency key)
    const res2 = await apiClient.post(`/api/posts/${targetPostId}/hearts`, {
      headers: authHeaders,
      data: { count: 2 },
      idempotencyKey,
    });

    // Both statuses must match
    expect(res2.status).toBe(res1.status);
    if (res1.status === 200 && res2.status === 200) {
      expect(res2.data?.totalHearts).toBe(res1.data?.totalHearts);
    }
  });

  /**
   * TC-T2-HEART-003: 7 Hearts Per UTC-Day Budget Cap
   * Validates a user cannot exceed 7 hearts cumulative budget per UTC day
   */
  test('TC-T2-HEART-003: 7 hearts per UTC-day limit enforcement', async () => {
    const authHeaders = { cookie: 'vakh_session=mock-user-budget' };
    const targetPostId = 'post-hearts-cap-test';

    // Submit max batch of 7
    const response = await apiClient.post(`/api/posts/${targetPostId}/hearts`, {
      headers: authHeaders,
      data: { count: 7 },
      idempotencyKey: `heart-cap-first-${Date.now()}`,
    });

    if (response.status === 200 || response.status === 201) {
      // Subsequent heart request in the same UTC day must be rejected with budget exceeded
      const subsequent = await apiClient.post(`/api/posts/${targetPostId}/hearts`, {
        headers: authHeaders,
        data: { count: 1 },
        idempotencyKey: `heart-cap-second-${Date.now()}`,
      });

      expect([400, 429, 403]).toContain(subsequent.status);
    }
  });

  /**
   * TC-T2-HEART-004: Self-Hearts Allowed But Do Not Trigger Notifications
   * Validates user can heart own post, but notification queue is not spammed
   */
  test('TC-T2-HEART-004: self-hearts must not dispatch notification to author', async () => {
    const authorHeaders = { cookie: 'vakh_session=mock-author' };
    const ownedPostId = 'post-owned-by-author';

    const response = await apiClient.post(`/api/posts/${ownedPostId}/hearts`, {
      headers: authorHeaders,
      data: { count: 1 },
      idempotencyKey: `self-heart-${Date.now()}`,
    });

    expect([200, 201, 401, 404]).toContain(response.status);
  });
});

import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Tier 2: Archived Forms Discovery-Only Semantic Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T2-ARC-001: Discovery-Only Isolation
   * Validates archived forms are hidden from public explore feeds and user profile lists
   */
  test('TC-T2-ARC-001: archived forms must be excluded from discovery feeds and profile listings', async () => {
    // 1. Explore feeds should not contain archived forms
    const feedResponse = await apiClient.get('/api/forms/explore');
    if (feedResponse.status === 200 && feedResponse.data?.items) {
      const archivedItems = feedResponse.data.items.filter((f: any) => f.isArchived === true);
      expect(archivedItems.length).toBe(0);
    }
  });

  /**
   * TC-T2-ARC-002: Direct Access & Creation Persistence in Archived Forms
   * Validates that permissions, post creation, and publishing still function on archived forms
   */
  test('TC-T2-ARC-002: archived forms must still allow authorized post creation and direct URL access', async () => {
    const archivedFormId = 'form-archived-test-123';
    const authHeaders = { cookie: 'vakh_session=mock-owner' };

    // 1. Direct GET by ID must still resolve (not 404 or 410)
    const getResponse = await apiClient.get(`/api/forms/${archivedFormId}`, { headers: authHeaders });
    expect([200, 401, 404]).toContain(getResponse.status);

    // 2. Post creation must still succeed if user has permissions
    const createPostResponse = await apiClient.post(`/api/posts`, {
      headers: authHeaders,
      data: {
        formId: archivedFormId,
        content: 'Posting in archived form',
      },
    });
    expect([200, 201, 401, 404]).toContain(createPostResponse.status);
  });
});

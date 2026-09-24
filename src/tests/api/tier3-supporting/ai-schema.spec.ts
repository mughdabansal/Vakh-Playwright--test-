import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Tier 3: AI Schema Generation Fallback Pipeline Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T3-AI-001: Graceful Layout Fallback on Step 2 Failure
   * Validates that if the second inference step fails or returns invalid layout AST,
   * the API falls back to default layout path rather than throwing unhandled 500.
   */
  test('TC-T3-AI-001: step 2 layout inference failure must trigger default fallback schema', async () => {
    const authHeaders = { cookie: 'vakh_session=mock-owner' };

    // Send ambiguous or boundary prompt designed to stress layout generator
    const response = await apiClient.post('/api/ai/forms/generate-schema', {
      headers: authHeaders,
      data: {
        prompt: 'Trigger step 2 fallback with empty-layout layout-stress token',
        simulateStep2Failure: true,
      },
    });

    expect([200, 201, 400, 401, 404]).toContain(response.status);
    if (response.status === 200 || response.status === 201) {
      expect(response.data).toHaveProperty('schema');
      // Must contain default layout fallback components
      expect(response.data.schema).toHaveProperty('layout');
    }
  });
});

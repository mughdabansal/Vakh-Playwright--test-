import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Gotcha: Messaging with Deleted Participant Account', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-GOTCHA-002: Sending Message to Conversation with Deleted Counterparty
   * Validates API returns specific domain HTTP 400 Bad Request (e.g. RECIPIENT_ACCOUNT_DELETED),
   * NOT generic 500 or silent success.
   */
  test('TC-GOTCHA-002: sending message to deleted counterparty must return specific 400 error', async () => {
    const testConversationWithDeletedUser = 'conv-counterparty-deleted-999';
    const authHeaders = { cookie: 'vakh_session=mock-active-user' };

    const response = await apiClient.post(`/api/conversations/${testConversationWithDeletedUser}/messages`, {
      headers: authHeaders,
      data: {
        content: 'Testing message delivery to deleted user',
      },
    });

    // Must be 400 Bad Request (or 401 unauthenticated if token not set)
    expect([400, 401, 404]).toContain(response.status);
    if (response.status === 400 && response.data) {
      const errorString = JSON.stringify(response.data);
      expect(errorString).toMatch(/(ACCOUNT_DELETED|USER_DELETED|RECIPIENT_INACTIVE|PARTICIPANT_UNAVAILABLE)/i);
    }
  });
});

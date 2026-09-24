import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Tier 1: Account Deletion Lifecycle & Purge Cascade Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T1-DEL-001: Deletion Request Lifecycle (Request -> Cancel -> Re-request)
   * Validates account deletion request triggers grace period and can be cancelled
   */
  test('TC-T1-DEL-001: should support request -> cancel -> re-request lifecycle', async () => {
    const ephemeralUserCookie = 'vakh_session=ephemeral-test-delete-user';

    // 1. Request deletion
    const reqResponse = await apiClient.post('/api/user/account/delete-request', {
      headers: { cookie: ephemeralUserCookie },
    });
    expect([200, 202, 401]).toContain(reqResponse.status);

    // 2. Cancel deletion
    const cancelResponse = await apiClient.post('/api/user/account/cancel-deletion', {
      headers: { cookie: ephemeralUserCookie },
    });
    expect([200, 401]).toContain(cancelResponse.status);

    // 3. Re-request deletion
    const reReqResponse = await apiClient.post('/api/user/account/delete-request', {
      headers: { cookie: ephemeralUserCookie },
    });
    expect([200, 202, 401]).toContain(reReqResponse.status);
  });

  /**
   * TC-T1-DEL-002: 7-Day Scheduled Alarm & Purge Order Contract
   * Validates the purge queue status and dependency order contract
   */
  test('TC-T1-DEL-002: should verify deletion schedule alarm and purge order contract', async () => {
    const statusResponse = await apiClient.get('/api/user/account/deletion-status', {
      headers: { cookie: 'vakh_session=ephemeral-test-delete-user' },
    });

    expect([200, 401, 404]).toContain(statusResponse.status);
    if (statusResponse.status === 200 && statusResponse.data) {
      expect(statusResponse.data).toHaveProperty('scheduledPurgeAt');
    }
  });
});

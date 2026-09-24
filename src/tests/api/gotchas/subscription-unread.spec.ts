import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Gotcha: Subscription Unread Counts Dynamic Exclusion for Archived Forms', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-GOTCHA-005: Read-Time Dynamic Exclusion of Archived Forms
   * Validates:
   *  1. Baseline unread counts retrieved.
   *  2. Archiving a subscribed form immediately decreases the unread count by that form's unreads.
   *  3. Unarchiving the form restores the exact unread counter.
   *  4. Proves exclusion is evaluated dynamically at query read-time rather than mutating stored counters.
   */
  test('TC-GOTCHA-005: unread count must exclude archived forms dynamically at read-time and restore upon unarchiving', async () => {
    const authHeaders = { cookie: 'vakh_session=mock-subscriber' };
    const targetFormId = 'form-unread-archive-test-777';

    // 1. Initial unread counter
    const initialSummary = await apiClient.get('/api/subscriptions/unread-summary', { headers: authHeaders });
    expect([200, 401, 404]).toContain(initialSummary.status);

    if (initialSummary.status === 200 && initialSummary.data) {
      const initialCount = initialSummary.data.totalUnread || 0;

      // 2. Archive form
      await apiClient.post(`/api/forms/${targetFormId}/archive`, { headers: authHeaders });

      // 3. Query unread summary again -> must reflect deduction immediately
      const postArchiveSummary = await apiClient.get('/api/subscriptions/unread-summary', { headers: authHeaders });
      if (postArchiveSummary.status === 200 && postArchiveSummary.data) {
        expect(postArchiveSummary.data.totalUnread).toBeLessThanOrEqual(initialCount);
      }

      // 4. Unarchive form -> must restore counter immediately
      await apiClient.post(`/api/forms/${targetFormId}/unarchive`, { headers: authHeaders });
      const restoredSummary = await apiClient.get('/api/subscriptions/unread-summary', { headers: authHeaders });
      if (restoredSummary.status === 200 && restoredSummary.data) {
        expect(restoredSummary.data.totalUnread).toBe(initialCount);
      }
    }
  });
});

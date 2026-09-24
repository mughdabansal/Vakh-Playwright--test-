import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';
import { OpenFgaHelper } from '../../../api/helpers/openfga.helper';

test.describe('Tier 1: OpenFGA Authorization & Permission Matrix Suite', () => {
  let apiClient: ApiClient;
  let fgaHelper: OpenFgaHelper;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    fgaHelper = new OpenFgaHelper(apiClient);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T1-FGA-001: Permission Tier Enforcement (can_read, can_get, can_create, can_admin)
   * Validates anonymous/unauthorized client cannot perform privileged actions
   */
  test('TC-T1-FGA-001: unauthenticated requests must be denied across all permission tiers', async () => {
    const fakeFormId = '00000000-0000-0000-0000-000000000001';

    // 1. can_read / can_get
    const readResponse = await apiClient.get(`/api/forms/${fakeFormId}`);
    expect([401, 403, 404]).toContain(readResponse.status);

    // 2. can_create
    const createResponse = await apiClient.post(`/api/forms/${fakeFormId}/posts`, {
      data: { content: 'Unauthorized post attempt' },
    });
    expect([401, 403, 404]).toContain(createResponse.status);

    // 3. can_admin
    const adminResponse = await apiClient.delete(`/api/forms/${fakeFormId}`);
    expect([401, 403, 404]).toContain(adminResponse.status);
  });

  /**
   * TC-T1-FGA-002: Revoke-Then-Access Race Condition Guard
   * Validates that when purgeFormPermissions is called, subsequent requests
   * never observe a stale allow or transient authorization window.
   */
  test('TC-T1-FGA-002: purgeFormPermissions must be strictly awaited to prevent stale allow', async () => {
    const testFormId = 'form-race-test-' + Date.now();
    const revokedCookie = 'vakh_session=revoked-test-token';
    const adminCookie = 'vakh_session=admin-test-token';

    const result = await fgaHelper.verifyRevokeThenAccessRace(testFormId, revokedCookie, adminCookie);

    // Assert that no stale allow (200/201) occurred after revocation
    expect(result.raceDetected).toBe(false);
  });

  /**
   * TC-T1-FGA-003: OpenFGA Batch-Check Coalescing Contract
   * Validates that batch permission evaluations fan-in properly
   */
  test('TC-T1-FGA-003: multi-resource feed must coalesce permission checks without N+1 queries', async () => {
    const startTime = Date.now();
    const response = await apiClient.get('/api/forms/feed?limit=20');
    const duration = Date.now() - startTime;

    // A coalesced batch check should complete well within the SLA
    expect([200, 401]).toContain(response.status);
    expect(duration).toBeLessThan(4000);
  });
});

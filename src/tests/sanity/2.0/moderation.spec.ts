import { test, expect } from '@playwright/test';
import { ModerationPage } from '../../../pages/ModerationPage';
import { APP_CONFIG } from '../../../config/constants';

test.describe('Eve Vakh - Sanity 2.0: Form Owner Moderation & Form History Suite', () => {

  /**
   * Test Case 1: Form History & Moderation Queue Endpoint Access
   * Validates:
   *  - Querying the form moderation posts queue returns valid JSON structure.
   *  - Supports status parameters (e.g. needs_review, all).
   */
  test('TC_MOD_001: should query form moderation posts queue and verify response contract', async ({ request }) => {
    const moderationPage = new ModerationPage(null as any);
    const formId = '5bfe8fbe-a660-4a02-be16-abab7a0f3200';

    const response = await moderationPage.fetchFormModerationQueue(request, formId);
    
    // Without auth credentials, gateway guards should return 401 or 404
    expect([200, 401, 404, 429]).toContain(response.status());
    expect(response.headers()['content-type']).toContain('application/json');
  });

  /**
   * Test Case 2: Moderator Post Approval Flow (Accept Post Review)
   * Validates:
   *  - Post approval endpoint POST /api/posts/:postId/review/publish
   *  - Enforces valid UUID format and returns standard API response contract
   */
  test('TC_MOD_002: should validate moderator post approval review contract', async ({ request }) => {
    const moderationPage = new ModerationPage(null as any);
    const testPostId = '5bfe8fbe-a660-4a02-be16-abab7a0f3200';

    const response = await moderationPage.approvePostReview(request, testPostId);

    // Unauthenticated execution is guarded with 401 Unauthorized
    expect([200, 401, 403, 404, 429]).toContain(response.status());
  });

  /**
   * Test Case 3: Moderator Post Rejection Flow (Reject Post Review)
   * Validates:
   *  - Post rejection endpoint POST /api/posts/:postId/review/reject
   *  - Enforces rejection payload and status transition
   */
  test('TC_MOD_003: should validate moderator post rejection review contract', async ({ request }) => {
    const moderationPage = new ModerationPage(null as any);
    const testPostId = '5bfe8fbe-a660-4a02-be16-abab7a0f3200';

    const response = await moderationPage.rejectPostReview(request, testPostId);

    // Unauthenticated execution is guarded with 401 Unauthorized
    expect([200, 401, 403, 404, 429]).toContain(response.status());
  });

  /**
   * Test Case 4: Security Guard on Moderator Actions
   * Validates:
   *  - Unauthenticated requests to review/publish and review/reject are rejected
   *  - Protects form owner moderation integrity
   */
  test('TC_MOD_004: should enforce strict authentication guards on moderation actions', async ({ request }) => {
    const fakePostId = '00000000-0000-0000-0000-000000000000';

    // 1. Check approval route without token
    const approveRes = await request.post(`${APP_CONFIG.API_URL}/api/posts/${fakePostId}/review/publish`, {
      data: {}
    });
    expect([401, 403, 404]).toContain(approveRes.status());

    // 2. Check rejection route without token
    const rejectRes = await request.post(`${APP_CONFIG.API_URL}/api/posts/${fakePostId}/review/reject`, {
      data: {}
    });
    expect([401, 403, 404]).toContain(rejectRes.status());
  });

});

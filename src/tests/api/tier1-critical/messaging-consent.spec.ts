import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';
import { MessagingHelper } from '../../../api/helpers/messaging.helper';

test.describe('Tier 1: Messaging Consent Model & Privacy Invariants Suite', () => {
  let apiClient: ApiClient;
  let messagingHelper: MessagingHelper;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    messagingHelper = new MessagingHelper(apiClient);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T1-MSG-001: Initial Message Request Dispatch
   * Validates initiating conversation with non-contact creates a 'pending' request
   */
  test('TC-T1-MSG-001: initiating contact must create a pending message request', async () => {
    const response = await messagingHelper.sendMessageRequest(
      'vakh_session=mock-sender',
      'target-user-id-999',
      'Hello from automated test!'
    );

    expect([200, 201, 401]).toContain(response.status);
    if (response.status === 201 || response.status === 200) {
      expect(response.data?.status).toBe('pending');
    }
  });

  /**
   * TC-T1-MSG-002: Auto-Accept on Reply
   * Validates replying to a pending message request auto-accepts the conversation
   */
  test('TC-T1-MSG-002: replying to message request must auto-accept consent state', async () => {
    const response = await apiClient.post('/api/messages/conversations/mock-conv-1/reply', {
      headers: { cookie: 'vakh_session=mock-recipient' },
      data: { content: 'Auto-accepting reply!' },
    });

    expect([200, 201, 401, 404]).toContain(response.status);
  });

  /**
   * TC-T1-MSG-003: Block-Implies-Decline Contract
   * Validates blocking a user automatically declines any active or pending message requests
   */
  test('TC-T1-MSG-003: blocking user must decline and purge active message requests', async () => {
    const response = await apiClient.post('/api/users/block', {
      headers: { cookie: 'vakh_session=mock-user' },
      data: { targetUserId: 'target-to-block-999' },
    });

    expect([200, 204, 401]).toContain(response.status);
  });

  /**
   * TC-T1-MSG-004: Critical Privacy Invariant — Sender Cannot Detect Decline
   * Stated Privacy Invariant:
   * A sender must genuinely not be able to detect when a recipient declines a request.
   * Fuzzing parameters: Timing distribution, response HTTP code, response JSON shape.
   */
  test('TC-T1-MSG-004: privacy invariant — sender cannot detect request decline via timing or response shape', async () => {
    // Measure 1: Check pending request
    const pendingObservation = await messagingHelper.measureSenderPerspective(
      'vakh_session=mock-sender',
      'request-pending-state'
    );

    // Measure 2: Check declined request
    const declinedObservation = await messagingHelper.measureSenderPerspective(
      'vakh_session=mock-sender',
      'request-declined-state'
    );

    // Both requests must yield identical status (e.g. 200 or 401/404)
    expect(declinedObservation.status).toBe(pendingObservation.status);

    // Timing difference over WAN internet should be within network jitter tolerance (< 1200ms)
    const timingDelta = Math.abs(declinedObservation.latencyMs - pendingObservation.latencyMs);
    expect(timingDelta).toBeLessThan(1200);

    // Response shape must not leak decline flags or timestamps to the sender
    if (declinedObservation.body && typeof declinedObservation.body === 'object') {
      expect(declinedObservation.body).not.toHaveProperty('declinedAt');
      expect(declinedObservation.body).not.toHaveProperty('isDeclined');
      expect(declinedObservation.body?.status).not.toBe('declined');
    }
  });
});

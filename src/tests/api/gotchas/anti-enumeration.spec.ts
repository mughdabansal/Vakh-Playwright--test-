import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';
import { TEST_USERS } from '../../../config/constants';

test.describe('Gotcha: Anti-Enumeration Recovery OTP Dispatch Timing & Response Parity', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  /**
   * TC-GOTCHA-001: Anti-Enumeration Latency & Status Indistinguishability
   * Target: POST /api/auth/phone-number/send-otp or recovery OTP dispatch
   * Validates known vs unknown accounts return identical responses and indistinguishable timings
   */
  test('TC-GOTCHA-001: recovery OTP dispatch must not leak existence via timing or response difference', async () => {
    // 1. Known registered user identifier
    const knownIdentifier = TEST_USERS.DEFAULT_USER.email;
    const knownStart = Date.now();
    const knownRes = await apiClient.post('/api/auth/email-otp/send-verification-otp', {
      data: { email: knownIdentifier, type: 'sign-in' },
    });
    const knownDuration = Date.now() - knownStart;

    await new Promise(resolve => setTimeout(resolve, 400));

    // 2. Non-existent, unknown user identifier
    const unknownIdentifier = `nonexistent_${Date.now()}@vakh.com`;
    const unknownStart = Date.now();
    const unknownRes = await apiClient.post('/api/auth/email-otp/send-verification-otp', {
      data: { email: unknownIdentifier, type: 'sign-in' },
    });
    const unknownDuration = Date.now() - unknownStart;

    // Both requests must return identical status codes
    expect(unknownRes.status).toBe(knownRes.status);

    // Both requests must return identical top-level message keys
    if (knownRes.data && unknownRes.data) {
      const knownKeys = Object.keys(knownRes.data).sort();
      const unknownKeys = Object.keys(unknownRes.data).sort();
      expect(unknownKeys).toEqual(knownKeys);
    }

    // Timing difference must be within WAN internet jitter tolerance (< 1200ms)
    const timingDifference = Math.abs(knownDuration - unknownDuration);
    expect(timingDifference).toBeLessThan(1200);
  });
});

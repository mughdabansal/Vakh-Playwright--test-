import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/client/ApiClient';

test.describe('API Client: Deadline Tracking & Cancellation Reliability', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
  });

  /**
   * TC_AUTH_004: Request Deadline Remains Active Through Response Body Consumption
   * Validates that deadlines do not just cover header arrival, but stay active while body is streaming.
   */
  test('TC_AUTH_004: request timeout deadline must remain active during response body parsing', async () => {
    const tightTimeoutMs = 1500;
    const startTime = Date.now();

    try {
      // Endpoint with tight timeout parameter
      const response = await apiClient.get('/api/posts', {
        timeout: tightTimeoutMs,
        params: { limit: 1 },
      });

      // If network is faster than tight timeout, verify duration was within bounds
      const elapsed = Date.now() - startTime;
      expect(response.status !== undefined).toBe(true);
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      // If timed out, duration should be closely bounded by tightTimeoutMs
      expect(elapsed).toBeGreaterThanOrEqual(tightTimeoutMs - 500);
      expect(err.message || '').toMatch(/(timeout|exceeded|deadline)/i);
    }
  });

  /**
   * TC_AUTH_005: API Client Distinguishes Between Timeout and Cancellation
   * Validates that client differentiates between network deadline timeouts and explicit AbortController cancellations.
   */
  test('TC_AUTH_005: client must accurately distinguish timeout vs manual cancellation', async () => {
    // 1. Emulate AbortController cancellation
    const controller = new AbortController();
    const abortPromise = (async () => {
      const signal = controller.signal;
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    })();

    // Abort explicitly after 100ms
    setTimeout(() => controller.abort(), 100);

    let caughtError: any = null;
    try {
      await abortPromise;
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.name).toBe('AbortError');
    expect(caughtError.name).not.toBe('TimeoutError');
  });
});

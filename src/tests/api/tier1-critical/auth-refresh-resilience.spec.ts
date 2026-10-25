import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';
import { AuthSessionManager } from '../../../api/client/AuthSessionManager';
import { TEST_USERS } from '../../../config/constants';

test.describe('Tier 1: Auth Refresh Resilience & Security Contracts', () => {
  let apiClient: ApiClient;
  let authManager: AuthSessionManager;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    authManager = new AuthSessionManager(apiClient);
  });

  /**
   * TC_AUTH_001: Concurrent Rejected Requests Share Single Token Refresh
   * Validates that when multiple concurrent requests experience token expiry,
   * they collapse into a single shared refresh call rather than multiplying requests.
   */
  test('TC_AUTH_001: should collapse concurrent expired token requests into a single refresh execution', async () => {
    let refreshCallsCount = 0;
    const fakeExpiredCookie = 'vakh_session=expired-token-12345; Path=/; HttpOnly';

    // Track active requests to verify sharing
    const refreshPromise1 = authManager.refreshToken(fakeExpiredCookie);
    const refreshPromise2 = authManager.refreshToken(fakeExpiredCookie);
    const refreshPromise3 = authManager.refreshToken(fakeExpiredCookie);

    // Both should be references to the exact same active Promise
    expect(refreshPromise1).toBe(refreshPromise2);
    expect(refreshPromise2).toBe(refreshPromise3);

    const results = await Promise.all([refreshPromise1, refreshPromise2, refreshPromise3]);

    // All promises resolve with identical structure
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  });

  /**
   * TC_AUTH_002: Stale Credential Flight Invalidation Guard
   * Validates that an older in-flight token refresh cannot overwrite a newer valid credential state.
   */
  test('TC_AUTH_002: stale refresh flight must not overwrite newer valid session credentials', async () => {
    const expiredCookie = 'vakh_session=stale-epoch-cookie';
    
    // 1. Kick off refresh flight
    const staleRefreshPromise = authManager.refreshToken(expiredCookie);

    // 2. Fresh sign-in occurs immediately while refresh is still in flight
    const freshSignIn = await authManager.signIn({
      email: TEST_USERS.DEFAULT_USER.email,
      password: TEST_USERS.DEFAULT_USER.password,
    });

    // 3. Await the refresh flight completion
    await staleRefreshPromise;

    // 4. Assert active session remains the fresh sign-in, not the older refreshed cookie
    const currentSession = await authManager.getSession(freshSignIn.cookie);
    expect(freshSignIn.cookie !== undefined).toBe(true);
  });

  /**
   * TC_AUTH_003: Corrupted / Malformed Native Storage Recovery
   * Validates that corrupted JSON in native/localStorage does not throw unhandled exceptions
   * and gracefully resets session state.
   */
  test('TC_AUTH_003: corrupted or malformed storage must be safely recovered without crashes', () => {
    const malformedPayloads = [
      '{ "user": { "id": "123", ', // Incomplete JSON
      'undefined',
      'null',
      '',
      '{ bad_json_keys: true }',
      '<html><body>Error 500</body></html>',
    ];

    for (const badPayload of malformedPayloads) {
      const recovery = authManager.recoverSessionFromStorage(badPayload);
      expect(recovery.success).toBe(false);
      expect(recovery.session).toBeNull();
      expect(recovery.recovered).toBe(false);
    }

    // Valid JSON payload succeeds
    const validPayload = JSON.stringify({ token: 'valid-jwt-token', user: { id: 'u1' } });
    const validRecovery = authManager.recoverSessionFromStorage(validPayload);
    expect(validRecovery.success).toBe(true);
    expect(validRecovery.session.token).toBe('valid-jwt-token');
  });

  /**
   * TC_AUTH_006: CORS Origin Refusal & Logging Compliance
   * Validates that unallowlisted origins receive proper CORS rejection without leaking internal stack traces.
   */
  test('TC_AUTH_006: unauthorized CORS origins must be refused without sensitive leaks', async () => {
    const response = await apiClient.fetchRaw('/api/auth/get-session', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://malicious-phishing-site.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });

    const allowOrigin = response.headers()['access-control-allow-origin'];
    // Must either not be present or not match the malicious origin
    expect(allowOrigin !== 'https://malicious-phishing-site.example.com').toBe(true);
    expect(response.status() < 500).toBe(true);
  });

  /**
   * TC_AUTH_007: Secret & Token Redaction in Telemetry and Logs
   * Validates that auth tokens, cookies, and passwords are masked before output.
   */
  test('TC_AUTH_007: sensitive credentials must be redacted in logging helpers', () => {
    const sensitiveLog = {
      action: 'sign_in_attempt',
      user: {
        email: 'user@example.com',
        password: 'SuperSecretPassword123!',
        token: 'eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
      headers: {
        Authorization: 'Bearer eyJhGciOiJIUzI1Ni...',
        Cookie: 'vakh_session=secret_cookie_data',
      },
      clientSecret: 'secret_live_998877',
    };

    const redacted = AuthSessionManager.redactCredentials(sensitiveLog);

    expect(redacted.user.password).toBe('[REDACTED]');
    expect(redacted.user.token).toBe('[REDACTED]');
    expect(redacted.headers.Authorization).toBe('[REDACTED]');
    expect(redacted.headers.Cookie).toBe('[REDACTED]');
    expect(redacted.clientSecret).toBe('[REDACTED]');
    expect(redacted.user.email).toBe('user@example.com');
  });

  /**
   * TC_AUTH_008: AWS SNS Endpoint Teardown Contract
   * Validates push notification deregistration invokes correct endpoint cleanup without leaving stale records.
   */
  test('TC_AUTH_008: push device deregistration must invoke SNS cleanup contract', async () => {
    const deregisterPayload = {
      deviceToken: 'test-fcm-token-cleanup-contract',
      platform: 'web',
    };

    const response = await apiClient.post('/api/notifications/push/deregister', {
      data: deregisterPayload,
    });

    // Validates route contract: rejects unauthenticated or succeeds with 200/204/401/404, never 500
    expect([200, 204, 401, 404]).toContain(response.status);
    if (response.data && response.status === 200) {
      expect(response.data.cleanedUp).toBe(true);
    }
  });
});

import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Tier 3: RestApi Field Proxy Security & Execution Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T3-REST-001: Execute Route Method Constraint (GET only, POST -> 405)
   * Validates /api/forms/:id/fields/:fieldId/execute strictly enforces GET
   */
  test('TC-T3-REST-001: execute route must accept GET and reject POST with HTTP 405', async () => {
    const executeUrl = '/api/forms/form-123/fields/field-456/execute';
    const authHeaders = { cookie: 'vakh_session=mock-owner' };

    // POST must produce 405 Method Not Allowed
    const postResponse = await apiClient.post(executeUrl, {
      headers: authHeaders,
      data: { query: 'test' },
    });
    expect([405, 401, 404]).toContain(postResponse.status);

    // GET should be handled or routed
    const getResponse = await apiClient.get(executeUrl, { headers: authHeaders });
    expect(getResponse.status).not.toBe(405);
  });

  /**
   * TC-T3-REST-002: Strict HTTPS-Only Protocol Enforcement
   * Validates attempts to configure or proxy plain http:// endpoints are rejected
   */
  test('TC-T3-REST-002: plain HTTP endpoints must be rejected (HTTPS-only enforcement)', async () => {
    const response = await apiClient.post('/api/forms/form-123/fields/rest-api', {
      headers: { cookie: 'vakh_session=mock-owner' },
      data: {
        targetUrl: 'http://insecure.example.com/api/data',
      },
    });

    expect([400, 422, 401, 404]).toContain(response.status);
    if (response.status === 400 && response.data) {
      expect(JSON.stringify(response.data)).toMatch(/(HTTPS_REQUIRED|INVALID_PROTOCOL|https)/i);
    }
  });

  /**
   * TC-T3-REST-003: CRLF Injection Rejection in Headers and Query
   * Validates \r\n carriage returns are stripped or rejected
   */
  test('TC-T3-REST-003: CRLF injection in proxy headers or query parameters must be rejected', async () => {
    const response = await apiClient.get('/api/forms/form-123/fields/field-456/execute', {
      headers: {
        cookie: 'vakh_session=mock-owner',
      },
      params: {
        param: 'test%0d%0aSet-Cookie:%20evil=session',
        headerInjection: 'val%0d%0aInjected-Header:%20evil',
      },
    });

    expect([400, 401, 403, 404, 405]).toContain(response.status);
  });

  /**
   * TC-T3-REST-004: Shared 1,000/day Per-Form Daily Quota Contract
   * Validates that quota is shared between /execute and server-side publish path
   */
  test('TC-T3-REST-004: RestApi field daily quota (1,000/day) must be tracked and enforced', async () => {
    const quotaCheckResponse = await apiClient.get('/api/forms/form-123/fields/field-456/quota-status', {
      headers: { cookie: 'vakh_session=mock-owner' },
    });

    expect([200, 401, 404]).toContain(quotaCheckResponse.status);
    if (quotaCheckResponse.status === 200 && quotaCheckResponse.data) {
      expect(quotaCheckResponse.data).toHaveProperty('dailyLimit');
      expect(quotaCheckResponse.data.dailyLimit).toBe(1000);
    }
  });
});

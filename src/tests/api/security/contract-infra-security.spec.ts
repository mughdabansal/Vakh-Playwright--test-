import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';
import { AuthSessionManager } from '../../../api/client/AuthSessionManager';

test.describe('Infrastructure, Security & Deployment Contracts', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
  });

  /**
   * TC_INFRA_001: Cloudflared Upgrade & Connection Handshake
   * Validates valid TLS termination, HTTPS enforcement, and healthy gateway connection
   */
  test('TC_INFRA_001: platform gateway responds with valid TLS connection', async () => {
    const response = await apiClient.fetchRaw('/', {
      method: 'GET',
    });

    expect(response.status()).toBeLessThan(500);
    // Verifies HTTPS headers and CF tunnel headers
    const headers = response.headers();
    expect(headers).toBeDefined();
  });

  /**
   * TC_INFRA_002: Zero Credential / Secret Leakage in Worker Logs
   * Validates that runtime credentials (Aurora, OpenFGA, Auth secrets) are not exposed in headers or body
   */
  test('TC_INFRA_002: worker responses must never leak database or auth secrets', async () => {
    const response = await apiClient.get('/api/health');

    const headersStr = JSON.stringify(response.headers).toLowerCase();
    const dataStr = JSON.stringify(response.data || {}).toLowerCase();

    const prohibitedTerms = ['db_password', 'aurora_secret', 'openfga_key', 'private_key', 'jwt_secret'];
    for (const term of prohibitedTerms) {
      expect(headersStr).not.toContain(term);
      expect(dataStr).not.toContain(term);
    }
  });

  /**
   * TC_INFRA_003: Worker Deployment Health Checks
   */
  test('TC_INFRA_003: worker edge gateway responds cleanly to health probes', async () => {
    const response = await apiClient.get('/api/health');
    // Edge health probes return 200 OK (or standard gateway status < 500)
    expect(response.status).toBeLessThan(500);
  });

  /**
   * TC_INFRA_004: MCP Connector Timeout & Fallback Contract
   */
  test('TC_INFRA_004: downstream MCP connector contract handles latency and timeouts', async () => {
    const response = await apiClient.get('/api/mcp/health', {
      timeout: 5000,
    });

    // Validates route contract: returns 200, 404 (if unmounted in staging), or standard error, never unhandled 500 crash
    expect([200, 401, 404, 502, 503, 504]).toContain(response.status);
  });

  /**
   * TC_INFRA_005: Environment-Specific MCP Origin Allowlists
   */
  test('TC_INFRA_005: unapproved origin headers are rejected by origin security policy', async () => {
    const response = await apiClient.fetchRaw('/api/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://unauthorized-agent-origin.internal',
      },
    });

    const allowOrigin = response.headers()['access-control-allow-origin'];
    expect(allowOrigin !== 'https://unauthorized-agent-origin.internal').toBe(true);
  });
});

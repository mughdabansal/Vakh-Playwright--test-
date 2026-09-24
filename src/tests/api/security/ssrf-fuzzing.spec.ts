import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Security: SSRF Defense Fuzzing on Proxy Endpoints', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * SSRF Payload Test Vectors covering:
   * - IPv4 loopback & private RFC 1918
   * - Cloud metadata (AWS, GCP, Azure, DigitalOcean)
   * - Full IPv6: loopback (::1), link-local (fe80::), Unique Local Addresses (ULA fc00::/7),
   *   and IPv4-mapped IPv6 in all 3 encodings:
   *   1. Dotted-quad: ::ffff:127.0.0.1
   *   2. Pure hex: ::ffff:7f00:1
   *   3. Fully expanded: 0:0:0:0:0:ffff:7f00:0001
   */
  const SSRF_PAYLOADS = [
    // IPv4 Loopback & Private
    'http://127.0.0.1:8080/admin',
    'http://127.1:80',
    'http://localhost:5432',
    'http://10.0.0.1/internal',
    'http://172.16.0.1/secrets',
    'http://192.168.1.1/router',

    // Cloud Metadata
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://100.100.100.200/latest/meta-data/',

    // Full IPv6 Suite
    'http://[::1]:8080/status',                      // Loopback
    'http://[fe80::1ff:fe23:4567:890a]/',           // Link-local
    'http://[fc00::1]/internal',                     // ULA
    'http://[fd00::1]/internal',                     // ULA
    'http://[::ffff:127.0.0.1]:8080/data',           // IPv4-mapped dotted-quad
    'http://[::ffff:7f00:1]:8080/data',              // IPv4-mapped pure hex
    'http://[0:0:0:0:0:ffff:7f00:0001]:8080/data',  // IPv4-mapped fully expanded
  ];

  for (const payload of SSRF_PAYLOADS) {
    test(`TC-SEC-SSRF: proxy must reject restricted SSRF target: ${payload}`, async () => {
      const response = await apiClient.post('/api/forms/form-123/fields/field-456/execute', {
        headers: { cookie: 'vakh_session=mock-owner' },
        data: { targetUrl: payload },
      });

      // Must be rejected with 400 Bad Request, 403 Forbidden, 405 Method Not Allowed, or 401
      expect([400, 403, 405, 422, 401]).toContain(response.status);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(500);
    });
  }
});

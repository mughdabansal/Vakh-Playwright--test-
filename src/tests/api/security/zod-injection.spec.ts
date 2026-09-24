import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Security: Zod Schema Injection & Validation Robustness Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  const INJECTION_PAYLOADS: Array<{ name: string; data: Record<string, any> }> = [
    // 1. Prototype Pollution attempt
    {
      name: 'Prototype pollution keys',
      data: JSON.parse('{"__proto__":{"isAdmin":true},"constructor":{"prototype":{"role":"admin"}},"content":"Pollution payload"}'),
    },
    // 2. Unexpected types: Array where string expected
    {
      name: 'Array where string expected',
      data: {
        title: ['Nested', 'Array', 'Values'],
        content: { key: 'object instead of string' },
      },
    },
    // 3. Huge string buffer / Denial of Service attempt
    {
      name: 'Oversized string field',
      data: {
        content: 'A'.repeat(100000),
      },
    },
    // 4. SQL / NoSQL Injection strings in JSON fields
    {
      name: 'SQL/NoSQL special characters',
      data: {
        email: "' OR 1=1 --",
        targetUserId: '{ "$ne": null }',
      },
    },
  ];

  for (const item of INJECTION_PAYLOADS) {
    test(`TC-SEC-ZOD: malformed input (${item.name}) must uniformly 400 and NEVER throw 500`, async () => {
      const response = await apiClient.post('/api/posts', {
        headers: {
          cookie: 'vakh_session=mock-authenticated-user',
          'content-type': 'application/json',
        },
        data: item.data,
      });

      // Must reject with 400 Bad Request (or 401/403 unauthorized), NEVER 500
      expect([400, 422, 401, 403]).toContain(response.status);
      expect(response.status).not.toBe(500);

      if (response.status === 400 && response.data) {
        expect(response.data).toHaveProperty('message');
      }
    });
  }
});


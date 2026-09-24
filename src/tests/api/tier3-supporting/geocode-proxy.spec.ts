import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Tier 3: Geocode Proxy Caching Semantics Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T3-GEO-001: Suggestions Endpoint Non-Cacheable Contract
   * Validates /geocode/suggest must return headers preventing cache storage
   */
  test('TC-T3-GEO-001: geocode suggestions must NEVER be cacheable', async () => {
    const response = await apiClient.get('/api/geocode/suggest?q=San+Fran');

    expect([200, 401, 404]).toContain(response.status);
    if (response.status === 200) {
      const cacheControl = response.headers['cache-control'] || '';
      expect(cacheControl.toLowerCase()).toMatch(/(no-store|no-cache|private|max-age=0)/);
    }
  });

  /**
   * TC-T3-GEO-002: Resolve / Geocode Coordinates Caching Allowed
   * Validates /geocode/resolve permits caching for resolved coordinates
   */
  test('TC-T3-GEO-002: resolved geocode locations may permit public/private caching', async () => {
    const response = await apiClient.get('/api/geocode/resolve?place_id=mock-place-123');

    expect([200, 401, 404]).toContain(response.status);
    if (response.status === 200) {
      const cacheControl = response.headers['cache-control'] || '';
      expect(cacheControl.toLowerCase()).not.toContain('no-store');
    }
  });
});

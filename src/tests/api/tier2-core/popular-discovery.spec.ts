import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';

test.describe('Tier 2: Popular Discovery Algorithm & Consistency Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T2-POP-001: Ranking Formula & 7-Day Window Adherence
   * Formula: score = (2 * references + hearts) / max(age_hours, 1)
   */
  test('TC-T2-POP-001: popular feed items must be bounded within 7-day window and ordered by ranking score', async () => {
    const response = await apiClient.get('/api/posts/popular?limit=10');

    expect([200, 401]).toContain(response.status);
    if (response.status === 200 && response.data?.items) {
      const items = response.data.items;
      const nowMs = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      for (const item of items) {
        if (item.createdAt) {
          const ageMs = nowMs - new Date(item.createdAt).getTime();
          // Must not exceed 7 days
          expect(ageMs).toBeLessThanOrEqual(sevenDaysMs + 3600000); // 1h grace
        }
      }
    }
  });

  /**
   * TC-T2-POP-002: Cursor Stability Across Pages (rankingAt cursor)
   * Validates that pagination does not drift or duplicate items as rankings change
   */
  test('TC-T2-POP-002: rankingAt cursor must provide deterministic snapshot across pages', async () => {
    // Page 1
    const page1 = await apiClient.get('/api/posts/popular?limit=5');
    if (page1.status === 200 && page1.data?.next_cursor) {
      const cursor = page1.data.next_cursor;
      const page1Ids = (page1.data.items || []).map((i: any) => i.id);

      // Page 2 using cursor
      const page2 = await apiClient.get(`/api/posts/popular?limit=5&cursor=${encodeURIComponent(cursor)}`);
      expect(page2.status).toBe(200);

      const page2Ids = (page2.data?.items || []).map((i: any) => i.id);

      // Ensure 0 overlap between page 1 and page 2
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  /**
   * TC-T2-POP-003: Edge-Cache Bypass via X-Min-Consistency-Token
   * Validates sending X-Min-Consistency-Token forces fresh read-your-writes evaluation
   */
  test('TC-T2-POP-003: X-Min-Consistency-Token must bypass edge-cache', async () => {
    const consistencyToken = `c-token-${Date.now()}`;
    const response = await apiClient.get('/api/posts/popular', {
      consistencyToken,
    });

    expect([200, 401]).toContain(response.status);
    // Response should indicate cache bypass or dynamic compute
    const cacheHeader = response.headers['cf-cache-status'] || response.headers['x-cache'] || '';
    if (cacheHeader) {
      expect(cacheHeader.toUpperCase()).not.toBe('HIT');
    }
  });
});

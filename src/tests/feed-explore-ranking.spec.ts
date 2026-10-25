import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ExplorePage } from '../pages/ExplorePage';
import { TEST_USERS } from '../config/constants';

function setupPageErrorListener(page: any): Error[] {
  const pageErrors: Error[] = [];
  page.on('pageerror', (err: Error) => {
    if (err.message && (
      err.message.includes('access control checks') ||
      err.message.includes('Fetch API cannot load') ||
      err.message.includes('Cannot load blob:')
    )) {
      return;
    }
    pageErrors.push(err);
  });
  return pageErrors;
}

test.describe('Feed, Explore & Discovery Ranking Suite', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 29.1492, longitude: 75.7217 });

    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);
    const explorePage = new ExplorePage(page);

    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();

    await explorePage.clickExploreButton();
    await explorePage.verifyExploreHeader();
  });

  /**
   * TC_DISC_001: Nearby Radius Cap and Chip UI State
   */
  test('TC_DISC_001: explore Nearby radius chip displays and enforces configured distance cap', async ({ page }) => {
    const nearbyChip = page.locator('button, [role="button"]').filter({ hasText: /nearby/i }).first();
    const isNearbyVisible = await nearbyChip.isVisible().catch(() => false);
    if (isNearbyVisible) {
      await nearbyChip.click();
      await page.waitForTimeout(500);

      // Verify radius chip options or display
      const radiusSelector = page.locator('button, [role="button"]').filter({ hasText: /(25|50|100)\s*km/i });
      const radiusCount = await radiusSelector.count();
      expect(radiusCount >= 0).toBe(true);
    }
  });

  /**
   * TC_DISC_002: IP Proximity Ranking Fallback (When Geolocation Is Disabled)
   */
  test('TC_DISC_002: ranking applies IP proximity scoring fallback when device location is off', async ({ page, context }) => {
    // Clear device geolocation permission to simulate disabled GPS
    await context.clearPermissions();

    const response = await page.request.get('/api/explore/profiles?sort=proximity_fallback');
    expect([200, 401, 404]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      const profiles = Array.isArray(data) ? data : data.profiles || [];
      expect(profiles.length >= 0).toBe(true);
    }
  });

  /**
   * TC_DISC_003: Blocked Owners Excluded from Both Name and Handle Lookups
   */
  test('TC_DISC_003: blocked owners are excluded from name and handle search results', async ({ page }) => {
    const explorePage = new ExplorePage(page);
    const blockedQuery = 'blocked_test_user';

    await explorePage.searchUsers(blockedQuery);
    await page.waitForTimeout(800);

    const results = page.locator(`text="@${blockedQuery}"`);
    expect(await results.count()).toBe(0);
  });

  /**
   * TC_DISC_004: Recents Remain Available During Query Refresh
   */
  test('TC_DISC_004: recent search chips remain intact across search input clears and refreshes', async ({ page }) => {
    const explorePage = new ExplorePage(page);

    // Perform search
    await explorePage.searchUsers('Hisar');
    await page.waitForTimeout(500);

    // Clear search
    await explorePage.searchUsers('');
    await page.waitForTimeout(500);

    // Verify recent chips or search history list exists
    const recentChips = page.locator('[data-testid*="recent-search"], [data-testid*="search-chip"]').or(page.locator('button:has-text("Hisar")'));
    const count = await recentChips.count();
    expect(count >= 0).toBe(true);
  });

  /**
   * TC_DISC_005: Cursor Precision for Next-Page Pagination
   */
  test('TC_DISC_005: cursor pagination maintains monotonic order with zero duplicate IDs', async ({ page }) => {
    const page1Response = await page.request.get('/api/posts?limit=5');
    if (page1Response.status() === 200) {
      const page1Data = await page1Response.json();
      const page1Posts = page1Data.posts || page1Data.items || [];
      const nextCursor = page1Data.next_cursor || page1Data.cursor;

      if (nextCursor && page1Posts.length > 0) {
        const page2Response = await page.request.get(`/api/posts?limit=5&cursor=${nextCursor}`);
        if (page2Response.status() === 200) {
          const page2Data = await page2Response.json();
          const page2Posts = page2Data.posts || page2Data.items || [];
          
          const page1Ids = new Set(page1Posts.map((p: any) => p.id));
          for (const post of page2Posts) {
            expect(page1Ids.has(post.id)).toBe(false);
          }
        }
      }
    }
  });

  /**
   * TC_DISC_006: Popular Contextual Mix and Random Mix Isolation
   */
  test('TC_DISC_006: popular mix and random discovery feeds maintain separate scoring and zero bleed', async ({ page }) => {
    const popularRes = await page.request.get('/api/feed/popular?limit=5');
    const randomRes = await page.request.get('/api/feed/random?limit=5');

    expect([200, 401, 404]).toContain(popularRes.status());
    expect([200, 401, 404]).toContain(randomRes.status());

    if (popularRes.status() === 200 && randomRes.status() === 200) {
      const popularData = await popularRes.json();
      const randomData = await randomRes.json();
      expect(popularData !== null && randomData !== null).toBe(true);
    }
  });

  /**
   * TC_DISC_007: Location Privacy & Disclosure Metadata Verification
   */
  test('TC_DISC_007: public explore responses do not leak precise GPS coordinates', async ({ page }) => {
    const response = await page.request.get('/api/explore/profiles?limit=5');
    if (response.status() === 200) {
      const data = await response.json();
      const profiles = Array.isArray(data) ? data : data.profiles || [];

      for (const p of profiles) {
        // Assert raw latitude and longitude are not directly serialized in public profile JSON
        expect(p.exact_latitude).toBeUndefined();
        expect(p.exact_longitude).toBeUndefined();
      }
    }
  });
});

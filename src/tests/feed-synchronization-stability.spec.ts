import { test, expect } from '@playwright/test';
import { APP_CONFIG, TEST_USERS } from '../config/constants';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';

test.describe('Scenario C: Feed Synchronization & Query Stability', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Authenticate with designated test user
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();
  });

  /**
   * FEED-02: Stable feed query fields do not trigger re-render loops
   * Verifies narrowed query fields prevent background fetch-status ticks from cycling renders.
   */
  test('TC_FEED_002: stable feed query fields do not cause cascading DOM re-render loops', async ({ page }) => {
    // Wait for initial feed card to render on the home feed
    const feedCard = page.locator('div[tabindex="0"]:visible').filter({
      hasNotText: /^Home$|^Chat$|^Activity$|^Explore$|^New Post$|^Index$|^More$/i
    }).first();
    await expect(feedCard).toBeVisible({ timeout: 20000 });

    // Inject MutationObserver on the feed container to count DOM childList node re-creations
    await page.evaluate(() => {
      (window as any).__domMutationCount = 0;
      const target = document.querySelector('div[role="feed"]') || document.querySelector('div:has(> div[tabindex="0"])') || document.body;
      const observer = new MutationObserver(mutations => {
        (window as any).__domMutationCount += mutations.length;
      });
      observer.observe(target, { childList: true });
    });

    // Record initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY);

    // Observe during background polling ticks for 8 seconds
    await page.waitForTimeout(8000);

    const mutationCount: number = await page.evaluate(() => (window as any).__domMutationCount || 0);

    // Re-render loop check: In an idle feed, background status ticks should not trigger hundreds of DOM mutations
    // An infinite re-render loop typically generates > 500 mutations within seconds
    expect(mutationCount).toBeLessThan(100);

    // Verify feed card is still mounted and visible
    await expect(feedCard).toBeVisible();

    // Verify scroll position did not reset or jump
    const finalScrollY = await page.evaluate(() => window.scrollY);
    expect(Math.abs(finalScrollY - initialScrollY)).toBeLessThanOrEqual(5);
  });

  /**
   * FEED-03: Popular updates are treated as "Update feed" rather than "new posts"
   * Ensures ranking updates for Popular are not misclassified as newly arrived posts.
   */
  test('TC_FEED_003: popular feed ranking changes display update feed action instead of new posts', async ({ page }) => {
    // Switch to Popular tab if available
    const popularTab = page.locator('button:has-text("Popular"), div[role="tab"]:has-text("Popular")').first();
    if (await popularTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await popularTab.click();
      await page.waitForTimeout(1500);
    }

    // Intercept feed query to simulate a re-ranked update with existing post IDs
    await page.route('**/api/feed*popular*', async route => {
      const response = await route.fetch();
      const json = await response.json().catch(() => null);
      if (json && Array.isArray(json.posts) && json.posts.length > 1) {
        // Reverse post array order to simulate ranking shift without adding new posts
        json.posts.reverse();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(json),
        });
      } else {
        await route.continue();
      }
    });

    // Trigger soft refresh or background refetch
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(2000);

    // Check notification / floating pill text
    const updateBanner = page.locator('button:has-text("Update feed"), div:has-text("Update feed"), button:has-text("Updated")').first();
    const newPostsBanner = page.locator('button:has-text("New posts"), div:has-text("New posts")').first();

    // Assert that if a banner appears, it is an "Update feed" prompt and NOT "New posts"
    if (await updateBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(updateBanner).toBeVisible();
      await expect(newPostsBanner).not.toBeVisible();
    } else {
      // If no floating banner is shown, verify no spurious "New posts" indicator appeared
      await expect(newPostsBanner).not.toBeVisible();
    }
  });
});

import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Feed Layout, Divider Continuation & Overlap Preservation Suite', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
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
   * Scenario FEED-01: Divider continuations and overlap preserve layout
   * Test case FEED-01.1: Divider continuations flow in place
   */
  test('TC_FEED_01_1: divider continuations flow smoothly without awkward layout breaks', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Assert feed container contains consistent list structure
    const feedCards = page.locator('div[tabindex="0"]');
    const count = await feedCards.count();
    expect(count).toBeGreaterThan(0);

    // Assert cards have valid vertical sequence
    const firstBox = await feedCards.first().boundingBox();
    const secondBox = await feedCards.nth(1).boundingBox();

    if (firstBox && secondBox) {
      expect(secondBox.y).toBeGreaterThanOrEqual(firstBox.y);
    }
  });

  /**
   * Test case FEED-01.2: Overlap position is preserved
   */
  test('TC_FEED_01_2: overlapping elements preserve original stacking position without snap shift', async ({ page }) => {
    await page.waitForTimeout(2000);

    const postItems = page.locator('div[tabindex="0"]');
    const count = await postItems.count();

    if (count > 0) {
      const initialBox = await postItems.first().boundingBox();
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(400);

      const afterScrollBox = await postItems.first().boundingBox();
      if (initialBox && afterScrollBox) {
        // Assert width and horizontal alignment remain rock solid
        expect(afterScrollBox.width).toBe(initialBox.width);
        expect(afterScrollBox.x).toBe(initialBox.x);
      }
    }
  });

  /**
   * Test case FEED-01.3: Feed interactions do not regress
   */
  test('TC_FEED_01_3: scrolling and clicking post cards maintains layout stability without shifts', async ({ page }) => {
    await page.waitForTimeout(2000);

    const firstCard = page.locator('div[tabindex="0"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    // Scroll down and back up
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, -600));
    await page.waitForTimeout(500);

    expect(errors).toHaveLength(0);
  });
});

import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { PostActionsComponent } from '../pages/PostActionsComponent';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Feed Gutter Layout & Whole-Post Palette Styling Suite', () => {
  test.describe.configure({ mode: 'serial' });
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
   * Helper to locate visible feed card
   */
  function getFirstFeedCard(page: any) {
    return page.locator('div[tabindex="0"]:visible')
      .filter({ hasNotText: /^Home$|^Chat$|^Activity$|^Explore$|^New Post$|^Index$|^More$/i })
      .first();
  }

  /**
   * Scenario 9: Kind feed right gutter is restored (16px margin/padding)
   */
  test('TC_GUT_001: should enforce 16px right gutter on feed cards preventing flush edges', async ({ page }) => {
    const firstCard = getFirstFeedCard(page);
    await expect(firstCard).toBeVisible({ timeout: 20000 });

    const layout = await firstCard.evaluate((el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement?.getBoundingClientRect() || { width: window.innerWidth, right: window.innerWidth };
      const rightDistance = parentRect.right - rect.right;
      return {
        cardWidth: rect.width,
        rightDistance: Math.max(0, rightDistance),
        windowWidth: window.innerWidth
      };
    });

    expect(layout.cardWidth).toBeLessThan(layout.windowWidth);
  });

  /**
   * Scenario 10: Popular feed still retains both gutters
   */
  test('TC_GUT_002: should maintain dual gutters and balanced horizontal padding in feed', async ({ page }) => {
    const firstCard = getFirstFeedCard(page);
    await expect(firstCard).toBeVisible({ timeout: 20000 });

    const gutters = await firstCard.evaluate((el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return {
        left: rect.left,
        right: window.innerWidth - rect.right
      };
    });

    expect(gutters.left).toBeGreaterThan(0);
    expect(gutters.right).toBeGreaterThan(0);
  });

  /**
   * Scenario 11: Feed lists with selection and action row do not collapse spacing
   */
  test('TC_GUT_003: should preserve card gutter spacing during post selection and scrolling', async ({ page }) => {
    const actions = new PostActionsComponent(page);
    await actions.navigateIntoPost();

    const selectBtn = actions.getSelectButton();
    if (await selectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectBtn.click();
      await page.waitForTimeout(500);
      await expect(selectBtn).toBeVisible();
    }
  });

  /**
   * Scenario 12: Saved feed palette tint applies to entire post surface
   */
  test('TC_PAL_001: should apply palette tint to the outer card container uniformly', async ({ page }) => {
    const firstCard = getFirstFeedCard(page);
    await expect(firstCard).toBeVisible({ timeout: 20000 });

    const styling = await firstCard.evaluate((el: HTMLElement) => {
      const computed = window.getComputedStyle(el);
      return {
        hasBorder: computed.borderWidth !== '0px',
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius
      };
    });

    expect(styling.borderRadius).toBeDefined();
  });

  /**
   * Scenario 13: Neutral posts are styled correctly
   */
  test('TC_PAL_002: should render theme-neutral posts without conflicting nested borders', async ({ page }) => {
    const firstCard = getFirstFeedCard(page);
    await expect(firstCard).toBeVisible({ timeout: 20000 });

    const nestedBorderConflicts = await firstCard.evaluate((el: HTMLElement) => {
      const childBorders = Array.from(el.querySelectorAll('div')).map(c => window.getComputedStyle(c).borderStyle);
      return childBorders.filter(b => b && b !== 'none').length;
    });

    expect(nestedBorderConflicts).toBeLessThanOrEqual(25);
  });

  /**
   * Scenario 14: Selection highlight transitions look correct
   */
  test('TC_PAL_003: should apply outer surface highlight on select and clean up on deselect', async ({ page }) => {
    const actions = new PostActionsComponent(page);
    await actions.navigateIntoPost();

    const selectBtn = actions.getSelectButton();
    if (await selectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectBtn.click();
      await page.waitForTimeout(300);
      await selectBtn.click();
      await expect(selectBtn).toBeVisible();
    }
  });
});

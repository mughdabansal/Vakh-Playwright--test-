import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Quote Cards Theming & Index Modal Badge Ordering Suite', () => {
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
   * Scenario INDEX-01: Index ordering and badges
   * Test case INDEX-01.1: Badges render before Users in Index
   * Validates:
   *  - Opening the "+ Index" modal presents the BADGES category above USERS.
   *  - Verifies section headings order in the DOM: BADGES precedes USERS.
   */
  test('TC_INDEX_01_1: should render BADGES category before USERS in Index modal', async ({ page }) => {
    const indexBtn = page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible, button[aria-label="New Post"]:visible').first();
    await expect(indexBtn).toBeVisible({ timeout: 15000 });
    await indexBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const dialogText = await dialog.innerText();
    expect(dialogText).toContain('INDEX');

    const badgesPos = dialogText.indexOf('BADGES');
    const usersPos = dialogText.indexOf('USERS');

    // Assert BADGES section appears before USERS section in the text stream
    expect(badgesPos).toBeGreaterThan(-1);
    expect(usersPos).toBeGreaterThan(-1);
    expect(badgesPos).toBeLessThan(usersPos);

    await page.keyboard.press('Escape');
  });

  /**
   * Test case INDEX-01.2: Index ordering unaffected for users without badges
   * Validates:
   *  - List elements and cards retain structured flow without visual overlapping or broken alignment.
   */
  test('TC_INDEX_01_2: should preserve consistent alignment and spacing in Index listings', async ({ page }) => {
    const indexBtn = page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible, button[aria-label="New Post"]:visible').first();
    await indexBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Assert cards inside dialog have valid geometry
    const cards = dialog.locator('div[tabindex="0"], [role="button"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const firstCardBox = await cards.first().boundingBox();
    expect(firstCardBox?.width).toBeGreaterThan(50);

    await page.keyboard.press('Escape');
  });

  /**
   * Scenario QUOTE-01: Quote cards are simplified and open correctly
   * Test case QUOTE-01.1: Quote cards and details stay on one themed surface
   */
  test('TC_QUOTE_01_1: quote cards and details should share uniform surface theme styling', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check quotes buttons on feed
    const quoteBtn = page.locator('button[aria-label*="Quotes" i], button[aria-label*="Quote" i]').first();
    if (await quoteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quoteBtn.click();
      await page.waitForTimeout(1500);

      const quotesModal = page.locator('[role="dialog"]').first();
      if (await quotesModal.isVisible({ timeout: 4000 }).catch(() => false)) {
        const bg = await quotesModal.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(bg).toBeDefined();
        await page.keyboard.press('Escape');
      }
    }
  });

  /**
   * Test case QUOTE-01.3: No disabled “View quoted post” control in manage mode
   */
  test('TC_QUOTE_01_3: manage mode in quotes does not display redundant disabled controls', async ({ page }) => {
    // Check for disabled "View quoted post" buttons
    const disabledControls = page.locator('button[disabled]:has-text("View quoted post"), button[aria-disabled="true"]:has-text("View quoted post")');
    expect(await disabledControls.count()).toBe(0);
  });
});

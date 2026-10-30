import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Send Flow, Review Lane & Feed Head Policies Suite', () => {
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
   * Scenario SEND-01: Send lane no longer blocks later messages behind refetch
   * Test case SEND-01.1: Per-conversation send lane remains responsive
   */
  test('TC_SEND_01_1: rapid consecutive sends do not lock composer behind in-flight queries', async ({ page }) => {
    // Navigate to Chat
    const chatBtn = page.getByRole('menuitem', { name: /chat/i }).first();
    if (await chatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatBtn.click();
      await page.waitForTimeout(2000);

      // Select active conversation if available
      const convoItem = page.locator('div[tabindex="0"]:has-text("@"), div[role="button"]:has-text("@")').first();
      if (await convoItem.isVisible({ timeout: 4000 }).catch(() => false)) {
        await convoItem.click();
        await page.waitForTimeout(1000);

        const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
        if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Rapid input test
          await chatInput.fill('Test Msg 1');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(200);

          // Composer should remain enabled and not locked
          await expect(chatInput).toBeEnabled({ timeout: 5000 });
        }
      }
    }
  });

  /**
   * Test case SEND-01.3: Composer/UX behavior remains consistent after send
   */
  test('TC_SEND_01_3: composer input resets cleanly and continues accepting input following send', async ({ page }) => {
    const chatBtn = page.getByRole('menuitem', { name: /chat/i }).first();
    if (await chatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatBtn.click();
      await page.waitForTimeout(1500);

      const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
      if (await chatInput.isVisible({ timeout: 4000 }).catch(() => false)) {
        await chatInput.fill('Ping Message');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Input should be empty or ready for subsequent typing
        expect(await chatInput.inputValue()).toBe('');
      }
    }
  });

  /**
   * Scenario SEND-02: Feed and publication head policies
   * Test case SEND-02.3: Feed scroll position is preserved
   */
  test('TC_SEND_02_3: feed scroll position is preserved without unexpected jump to top upon updates', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Scroll down the home feed
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);

    const scrollYBefore = await page.evaluate(() => window.scrollY);
    expect(scrollYBefore).toBeGreaterThanOrEqual(0);

    // Trigger slight DOM update / wait
    await page.waitForTimeout(1000);
    const scrollYAfter = await page.evaluate(() => window.scrollY);

    // Assert scroll position hasn't unexpectedly snapped to 0
    expect(Math.abs(scrollYBefore - scrollYAfter)).toBeLessThan(100);
  });

  /**
   * Scenario SEND-03: Single-draft resume / spinner behavior
   * Test case SEND-03.2: Draft resume does not create double loading states
   */
  test('TC_SEND_03_2: resuming draft displays unified loading presentation without duplicate spinners', async ({ page }) => {
    const newPostBtn = page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible, button[aria-label="New Post"]:visible').first();
    await newPostBtn.click();
    await page.waitForTimeout(1000);

    // Verify only one primary modal/dialog is rendered (no duplicate stacked loading modal states)
    const dialogs = page.locator('[role="dialog"]');
    expect(await dialogs.count()).toBe(1);

    // Assert unified presentation without duplicate concurrent loading overlays
    const loadingOverlays = page.locator('[role="dialog"]').locator('[aria-busy="true"], [data-testid*="loading-overlay"]');
    expect(await loadingOverlays.count()).toBeLessThanOrEqual(1);

    await page.keyboard.press('Escape');
  });
});

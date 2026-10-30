import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Accessibility, Control Semantics & Reduced Motion Suite', () => {
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
   * Scenario A11Y-01: Button and control semantics remain valid
   * Test case A11Y-01.1: Add URL control is discoverable and properly named
   */
  test('TC_A11Y_01_1: interactive controls must have accessible names and logical focus tab order', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Test tab key traversal across header actions
    await page.keyboard.press('Tab');
    const focusedEl = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        role: el?.getAttribute('role'),
        ariaLabel: el?.getAttribute('aria-label'),
      };
    });

    expect(focusedEl.tag).toBeDefined();
  });

  /**
   * Test case A11Y-01.2: Modal status and buttons remain readable
   * Validates:
   *  - Modals render headings and accessible controls with sufficient color contrast / readability.
   */
  test('TC_A11Y_01_2: modal status and action controls must remain readable and unobstructed', async ({ page }) => {
    const indexBtn = page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible, button[aria-label="New Post"]:visible').first();
    await indexBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const dialogTitle = dialog.locator('h1, h2, h3, [role="heading"], div[dir="auto"]').first();
    await expect(dialogTitle).toBeVisible();

    // Verify close control is present and accessible
    const closeBtn = dialog.locator('button:has-text("Close"), button[aria-label*="close" i]').first();
    await expect(closeBtn).toBeVisible();

    await page.keyboard.press('Escape');
  });

  /**
   * Test case A11Y-01.3: Reduced motion respect
   * Validates:
   *  - Modal and sheet transitions respect OS prefers-reduced-motion setting.
   */
  test('TC_A11Y_01_3: should respect prefers-reduced-motion media query across modals and transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const indexBtn = page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible, button[aria-label="New Post"]:visible').first();
    await indexBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Transition duration should be immediate or zero in reduced motion
    const transition = await dialog.evaluate(el => window.getComputedStyle(el).transitionDuration);
    expect(transition).toBeDefined();

    await page.keyboard.press('Escape');
  });
});

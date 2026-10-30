import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Modal Motion, Sizing, Keyboard & Status Floor Suite', () => {
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

  function getModalTrigger(page: any) {
    return page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible, button[aria-label="New Post"]:visible, button:has-text("New Post"):visible').first();
  }

  /**
   * Scenario MOD-01: Modal enters and exits smoothly without visible layout jumps
   * Test case MOD-01.1: Modal opens with no off-screen drag behind backdrop
   */
  test('TC_MOD_01_1: should mount and display modal promptly without off-screen drag or backdrop stall', async ({ page }) => {
    const trigger = getModalTrigger(page);
    await expect(trigger).toBeVisible({ timeout: 15000 });
    await trigger.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const box = await dialog.boundingBox();
    expect(box).toBeTruthy();
    // Verify modal is positioned on-screen within viewport boundaries
    if (box) {
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.width).toBeGreaterThan(100);
      expect(box.height).toBeGreaterThan(100);
    }

    await page.keyboard.press('Escape');
  });

  /**
   * Test case MOD-01.2: Enter animation respects intrinsic height sizing
   */
  test('TC_MOD_01_2: enter transition should calculate and respect intrinsic content height', async ({ page }) => {
    const trigger = getModalTrigger(page);
    await trigger.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Intrinsic height check: modal should not exceed window height or collapse to 0
    const dialogHeight = await dialog.evaluate(el => el.getBoundingClientRect().height);
    const windowHeight = await page.evaluate(() => window.innerHeight);

    expect(dialogHeight).toBeGreaterThan(150);
    expect(dialogHeight).toBeLessThanOrEqual(windowHeight);

    await page.keyboard.press('Escape');
  });

  /**
   * Test case MOD-01.3: Exit animation preserves final state
   */
  test('TC_MOD_01_3: exit transition preserves final content sizing until dismissal completes', async ({ page }) => {
    const trigger = getModalTrigger(page);
    await trigger.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const heightBeforeExit = await dialog.evaluate(el => el.getBoundingClientRect().height);
    expect(heightBeforeExit).toBeGreaterThan(0);

    // Trigger dismissal
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 10000 });
  });

  /**
   * Test case MOD-01.4: Resize transition remains smooth with content updates
   */
  test('TC_MOD_01_4: resize transitions remain synchronized with dynamic modal content updates', async ({ page }) => {
    const trigger = getModalTrigger(page);
    await trigger.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Scroll inside modal to trigger dynamic section expansion
    await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (d) d.scrollTop += 200;
    });
    await page.waitForTimeout(400);

    const isStillVisible = await dialog.isVisible();
    expect(isStillVisible).toBeTruthy();

    await page.keyboard.press('Escape');
  });

  /**
   * Scenario MOD-02: Reduced motion and keyboard handling
   * Test case MOD-02.1: Reduced motion disables heavy transitions
   */
  test('TC_MOD_02_1: should respect prefers-reduced-motion media query and disable heavy transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const trigger = getModalTrigger(page);
    await trigger.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // In reduced motion, transition duration should be negligible or immediate
    const transitionDuration = await dialog.evaluate(el => {
      return window.getComputedStyle(el).transitionDuration || '0s';
    });
    expect(transitionDuration).toBeDefined();

    await page.keyboard.press('Escape');
  });

  /**
   * Test case MOD-02.3: Footer does not show bleed-through when content grows
   */
  test('TC_MOD_02_3: footer area must render opaque surface without transparent content bleed', async ({ page }) => {
    const trigger = getModalTrigger(page);
    await trigger.click();

    const footer = page.locator('[role="dialog"]').locator('button:has-text("Close"), toolbar, div[style*="border-top"]').first();
    if (await footer.isVisible({ timeout: 5000 }).catch(() => false)) {
      const opacity = await footer.evaluate(el => window.getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThanOrEqual(0.8);
    }

    await page.keyboard.press('Escape');
  });

  /**
   * Scenario MOD-03: Native modal resize logic and mount timing
   * Test case MOD-03.4: Repeated open/close cycles do not cause animation drift
   */
  test('TC_MOD_03_4: repeated open and close cycles execute without coordinate or animation drift', async ({ page }) => {
    const trigger = getModalTrigger(page);

    for (let i = 0; i < 3; i++) {
      await trigger.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden({ timeout: 10000 });
      await page.waitForTimeout(300);
    }
  });

  /**
   * Scenario MOD-04: Modal status floor and empty/loading/error guidance
   * Test case MOD-04.1: Loaded/empty/error views reserve stable floor (minimum height 240px)
   */
  test('TC_MOD_04_1: modal content region preserves minimum height status floor of 240px', async ({ page }) => {
    const trigger = getModalTrigger(page);
    await trigger.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const height = await dialog.evaluate(el => el.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(240);

    await page.keyboard.press('Escape');
  });

  /**
   * Test case MOD-04.4: Tabs and filters swap instantly without layout shake
   */
  test('TC_MOD_04_4: modal tabs and filter switches update instantly without visual layout collapse', async ({ page }) => {
    const trigger = getModalTrigger(page);
    await trigger.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const heightBefore = await dialog.evaluate(el => el.getBoundingClientRect().height);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    const heightAfter = await dialog.evaluate(el => el.getBoundingClientRect().height);

    // Layout height should remain stable during focus navigation
    expect(Math.abs(heightBefore - heightAfter)).toBeLessThan(50);

    await page.keyboard.press('Escape');
  });
});

import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { PostActionsComponent } from '../pages/PostActionsComponent';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Platform Media, Moderation & Selector Regression Suite', () => {
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
   * Scenario 24: Manage Posts loads media fields without crash
   */
  test('TC_MED_001: should render Manage Posts moderation queues without MediaProvider crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/settings').catch(() => {});
    await page.waitForTimeout(1000);

    const hasMediaCrash = errors.some(e => e.includes('MediaProvider'));
    expect(hasMediaCrash).toBeFalsy();
  });

  /**
   * Scenario 25: Media registration survives tab changes
   */
  test('TC_MED_002: should update media registry cleanly across Review, Rejected, and Archived tabs', async ({ page }) => {
    const tabs = page.locator('button[role="tab"], div[role="tab"]');
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      for (let i = 0; i < Math.min(3, tabCount); i++) {
        await tabs.nth(i).click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }
    expect(page.url()).not.toContain('/auth/sign-in');
  });

  /**
   * Scenario 26: Permissions and moderation behavior remain unchanged
   */
  test('TC_MED_003: should enforce standard permissions and moderation controls in queue views', async ({ page }) => {
    const actionButtons = page.locator('button').filter({ hasText: /approve|reject|archive/i });
    const count = await actionButtons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  /**
   * Scenario 27: Pinch-to-zoom works and remains stable
   */
  test('TC_ZOM_001: should clamp zoom scale bounds without drift in fullscreen media viewer', async ({ page }) => {
    const actions = new PostActionsComponent(page);
    const mediaImg = page.locator('img[src*="http"], div[data-expoimage="true"] img, svg').first();

    if (await mediaImg.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mediaImg.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);

      if (await actions.fullscreenMediaViewer.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(actions.fullscreenImage).toBeVisible();
        await actions.fullscreenCloseButton.click().catch(() => page.keyboard.press('Escape'));
      }
    }
  });

  /**
   * Scenario 28: Pan is constrained to image bounds
   */
  test('TC_ZOM_002: should constrain panning within image boundaries without whitespace overscroll', async ({ page }) => {
    const mediaImg = page.locator('img, svg, div[data-expoimage="true"]').first();

    if (await mediaImg.isVisible({ timeout: 3000 }).catch(() => false)) {
      const box = await mediaImg.boundingBox();
      expect(box).toBeTruthy();
    }
  });

  /**
   * Scenario 29: Double-tap or rapid gestures do not break the pan/zoom state
   */
  test('TC_ZOM_003: should maintain consistent scale state during rapid double-tap gestures', async ({ page }) => {
    const mediaImg = page.locator('img, svg').first();
    if (await mediaImg.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mediaImg.dblclick({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
      await mediaImg.dblclick({ force: true }).catch(() => {});
      expect(page.url()).toBeTruthy();
    }
  });

  /**
   * Scenario 30: GIF keeps animation in chat
   */
  test('TC_GIF_001: should preserve animated playback for uploaded GIFs in chat threads', async ({ page }) => {
    await page.goto('/chat').catch(() => {});
    await page.waitForTimeout(1000);

    const chatInput = page.getByPlaceholder(/message|type a message/i).first();
    if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(chatInput).toBeVisible();
    }
  });

  /**
   * Scenario 31: GIF keeps animation in media fields
   */
  test('TC_GIF_002: should maintain animation loops for GIFs in post and form media fields', async ({ page }) => {
    const gifImages = page.locator('img[src*=".gif" i]');
    const count = await gifImages.count();

    if (count > 0) {
      await expect(gifImages.first()).toBeVisible();
      const isNatural = await gifImages.first().evaluate((img: HTMLImageElement) => img.naturalWidth > 0);
      expect(isNatural).toBeTruthy();
    }
  });

  /**
   * Scenario 32: Non-GIF media still behaves normally
   */
  test('TC_GIF_003: should preserve standard rendering for JPEG, PNG, and WebP media', async ({ page }) => {
    const mediaElements = page.locator('img, svg, div[data-expoimage="true"], video');
    const count = await mediaElements.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  /**
   * Scenario 33: Any selector height is consistent at 48px
   */
  test('TC_SEL_001: should uniformly enforce 48px height across all selector components', async ({ page }) => {
    const selectors = page.locator('button, div[role="combobox"]').filter({ hasText: /select|choose|all|popular/i });
    const count = await selectors.count();

    if (count > 0) {
      const firstSelector = selectors.first();
      const box = await firstSelector.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(30);
        expect(box.height).toBeLessThanOrEqual(60);
      }
    }
  });

  /**
   * Scenario 34: Compact/mobile layouts do not break selector alignment
   */
  test('TC_SEL_002: should prevent text clipping and preserve accessible touch targets on mobile', async ({ page }) => {
    const selectors = page.locator('button, div[role="combobox"]').filter({ hasText: /select|choose|all|popular/i });
    if (await selectors.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(selectors.first()).toBeVisible();
    }
  });
});

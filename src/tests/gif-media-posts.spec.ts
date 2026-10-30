import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - GIF Media Lifecycle & Post Rendering Test Suite', () => {
  test.setTimeout(90000);

  const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
  const GIF_1_PATH = path.join(FIXTURES_DIR, 'sample-anim-1.gif');
  const GIF_2_PATH = path.join(FIXTURES_DIR, 'sample-anim-2.gif');
  const GIF_3_PATH = path.join(FIXTURES_DIR, 'sample-anim-3.gif');
  const GIF_4_PATH = path.join(FIXTURES_DIR, 'sample-anim-4.gif');
  const PHOTO_PATH = path.join(FIXTURES_DIR, 'sample-photo.png');

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
   * Helper to open the GIF media composer inside the user's owned GIF Testing Form.
   * Handles draft cleanups to prevent stale expired blob URIs from causing server upload errors.
   */
  async function openMediaComposer(page: Page) {
    await page.waitForTimeout(2500);

    // Locate the user's owned GIF Testing Form on the home feed
    const formCard = page.locator('div[tabindex="0"]').filter({ hasText: /GIF Testing Form/i }).first();
    if (await formCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await formCard.scrollIntoViewIfNeeded();
      await formCard.click();
    } else {
      // Fallback: navigate via subscriptions
      await page.goto('https://eve.vakh.com/settings/subscriptions', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const subCard = page.locator('div, [role="button"]').filter({ hasText: /GIF Testing Form/i }).first();
      await subCard.scrollIntoViewIfNeeded();
      await subCard.click();
    }
    await page.waitForTimeout(2000);

    // Click "New Post" in the GIF form
    const newPostBtn = page.locator('button:has-text("New Post"), button[aria-label="New Post"]').first();
    await expect(newPostBtn).toBeVisible({ timeout: 20000 });
    await newPostBtn.click();
    await page.waitForTimeout(1500);

    // Clean up any stale restored drafts
    const deleteMediaBtns = page.locator('[role="dialog"]').locator('button:has-text("Delete media"), button[aria-label*="Delete media" i], button:has-text("✕")');
    let count = await deleteMediaBtns.count();
    while (count > 0) {
      await deleteMediaBtns.first().click({ force: true });
      await page.waitForTimeout(400);
      count = await deleteMediaBtns.count();
    }
  }

  /**
   * Helper to upload a single GIF via the media dropzone file chooser.
   */
  async function uploadGif(page: Page, filename: string, buffer: Buffer, mimeType: string = 'image/gif') {
    const dropzone = page.locator('button:has-text("Add media or drop files"), [role="button"]:has-text("Add media or drop files")').first();
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
    await dropzone.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([{
      name: filename,
      mimeType: mimeType,
      buffer: buffer,
    }]);
    await page.waitForTimeout(2000);
  }

  /**
   * Helper to upload multiple media files simultaneously in one batch selection.
   */
  async function uploadBatch(page: Page, files: Array<{ name: string; buffer: Buffer; mimeType: string }>) {
    const dropzone = page.locator('button:has-text("Add media or drop files"), [role="button"]:has-text("Add media or drop files")').first();
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
    await dropzone.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(files);
    await page.waitForTimeout(2000);
  }

  /**
   * Helper to dismiss the composer modal cleanly.
   */
  async function closeComposer(page: Page) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const closeBtn = page.locator('[role="dialog"]').locator('button:has-text("Close")').first();
    if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
    }
  }

  /**
   * TC_GIF_001: Upload Animated GIF via File Picker in Composer & Verify Preview Attachment
   * Validates:
   *  - Animated GIF 1 (spinner) is selected via the media picker.
   *  - Composer processes the GIF and renders an active media thumbnail preview.
   *  - Attached media element indicates successful image/gif attachment.
   */
  test('TC_GIF_001: should upload animated GIF in post composer and display animated preview', async ({ page }) => {
    const gifBuffer = fs.readFileSync(GIF_1_PATH);

    await openMediaComposer(page);
    await uploadGif(page, 'sample-anim-1.gif', gifBuffer);

    // Verify preview thumbnail renders within the composer modal
    const mediaPreview = page.locator('[role="dialog"]').locator('div[style*="overflow: hidden"], img, div[data-expoimage="true"]').filter({ hasNotText: /close|create|draft/i }).first();
    await expect(mediaPreview).toBeVisible({ timeout: 15000 });

    await closeComposer(page);
  });

  /**
   * TC_GIF_002: Publish Post with Animated GIF & Validate Autoloop Media on Post Card
   * Validates:
   *  - Post with animated GIF 2 (Newton cradle) publishes successfully.
   *  - Published post card renders the GIF media element with active dimensions.
   */
  test('TC_GIF_002: should publish post with animated GIF and render media element on post card', async ({ page }) => {
    const gifBuffer = fs.readFileSync(GIF_2_PATH);

    await openMediaComposer(page);
    await uploadGif(page, 'sample-anim-2.gif', gifBuffer);

    // Click Create and await dialog dismissal
    const createBtn = page.locator('[role="dialog"] button:has-text("Create")').first();
    await createBtn.click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 25000 });
    await page.waitForTimeout(2000);

    // Verify published post card with media element renders on the form feed
    const postMediaButton = page.locator('button[aria-label*=".gif" i], button:has(img)').filter({ visible: true }).first();
    await expect(postMediaButton).toBeVisible({ timeout: 15000 });
  });

  /**
   * TC_GIF_003: Multi-GIF Attachment in a Single Composer Draft
   * Validates:
   *  - Attaching multiple distinct animated GIFs (GIF 1 & GIF 3) in the composer draft.
   *  - Attached GIF media preview cards render in the composer without conflict.
   */
  test('TC_GIF_003: should attach multiple distinct animated GIFs in post composer', async ({ page }) => {
    const gif1Buffer = fs.readFileSync(GIF_1_PATH);
    const gif3Buffer = fs.readFileSync(GIF_3_PATH);

    await openMediaComposer(page);
    await uploadBatch(page, [
      { name: 'sample-anim-1.gif', buffer: gif1Buffer, mimeType: 'image/gif' },
      { name: 'sample-anim-3.gif', buffer: gif3Buffer, mimeType: 'image/gif' },
    ]);

    // Verify multiple media items are attached
    const mediaItems = page.locator('[role="dialog"]').locator('button:has-text("Delete media"), button[aria-label*="Delete media" i], button[aria-label*="Media item" i]');
    await expect(mediaItems.first()).toBeVisible({ timeout: 15000 });
    expect(await mediaItems.count()).toBeGreaterThanOrEqual(2);

    await closeComposer(page);
  });

  /**
   * TC_GIF_004: Launch Fullscreen Media Viewer for GIF & Verify Dismissal
   * Validates:
   *  - Clicking on a post GIF media preview launches the fullscreen media modal.
   *  - Dismissing the fullscreen viewer returns to the post view cleanly.
   */
  test('TC_GIF_004: should launch fullscreen media viewer on post GIF and dismiss cleanly', async ({ page }) => {
    // Navigate into the GIF Testing Form feed
    const formCard = page.locator('div[tabindex="0"]').filter({ hasText: /GIF Testing Form/i }).first();
    if (await formCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await formCard.scrollIntoViewIfNeeded();
      await formCard.click();
      await page.waitForTimeout(2000);
    }

    // Locate any post card that has a media image element
    const postWithMedia = page.locator('button[aria-label*=".gif" i]').first();
    await expect(postWithMedia).toBeAttached({ timeout: 15000 });
    await postWithMedia.evaluate(el => (el as HTMLElement).click());
    await page.waitForTimeout(1500);

    // Verify fullscreen media modal opens
    const fullscreenDialog = page.locator('[role="dialog"]').first();
    await expect(fullscreenDialog).toBeVisible({ timeout: 10000 });

    // Dismiss fullscreen viewer cleanly
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10000 });
  });

  /**
   * TC_GIF_005: Mixed Media Upload – Animated GIF alongside Static Photo
   * Validates:
   *  - Uploading an animated GIF (sample-anim-1.gif) and a static PNG photo together in the composer.
   *  - Composer accommodates mixed media without format conflict or error toast.
   */
  test('TC_GIF_005: should support mixed media attachment of animated GIF alongside static photo', async ({ page }) => {
    const gifBuffer = fs.readFileSync(GIF_1_PATH);
    const photoBuffer = fs.readFileSync(PHOTO_PATH);

    await openMediaComposer(page);
    await uploadBatch(page, [
      { name: 'sample-anim-1.gif', buffer: gifBuffer, mimeType: 'image/gif' },
      { name: 'sample-photo.png', buffer: photoBuffer, mimeType: 'image/png' },
    ]);

    // Verify both media items attached
    const mediaItems = page.locator('[role="dialog"]').locator('button:has-text("Delete media"), button[aria-label*="Delete media" i]');
    await expect(mediaItems.first()).toBeVisible({ timeout: 15000 });
    expect(await mediaItems.count()).toBeGreaterThanOrEqual(2);

    // Verify no error alert is present
    const errorAlert = page.locator('[role="alert"], [class*="error" i]').first();
    const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBeFalsy();

    await closeComposer(page);
  });

  /**
   * TC_GIF_006: In-Composer GIF Removal & Draft Replacement
   * Validates:
   *  - User can remove an attached GIF draft thumbnail from the composer.
   *  - Replaced high-res GIF (sample-anim-4.gif) uploads and updates the preview.
   */
  test('TC_GIF_006: should allow removing attached GIF draft and replacing with another GIF', async ({ page }) => {
    const gif1Buffer = fs.readFileSync(GIF_1_PATH);
    const gif4Buffer = fs.readFileSync(GIF_4_PATH);

    await openMediaComposer(page);

    // 1. Attach GIF 1
    await uploadGif(page, 'sample-anim-1.gif', gif1Buffer);
    const mediaPreview = page.locator('[role="dialog"]').locator('div[style*="overflow: hidden"], img, div[data-expoimage="true"]').filter({ hasNotText: /close|create|draft/i }).first();
    await expect(mediaPreview).toBeVisible({ timeout: 10000 });

    // 2. Remove media attachment
    const removeBtn = page.locator('[role="dialog"]').locator('button:has-text("Delete media"), button[aria-label*="Delete media" i], button:has-text("✕")').first();
    await expect(removeBtn).toBeVisible({ timeout: 5000 });
    await removeBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // 3. Attach GIF 4 as replacement
    await uploadGif(page, 'sample-anim-4.gif', gif4Buffer);
    const replacementPreview = page.locator('[role="dialog"]').locator('div[style*="overflow: hidden"], img, div[data-expoimage="true"]').filter({ hasNotText: /close|create|draft/i }).first();
    await expect(replacementPreview).toBeVisible({ timeout: 15000 });

    await closeComposer(page);
  });
});

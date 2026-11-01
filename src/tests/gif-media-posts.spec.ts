import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { PostComposerPage } from '../pages/PostComposerPage';
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
    const composer = new PostComposerPage(page);
    await composer.openNewPostModal();
    await composer.selectTargetForm('posts');
  }

  /**
   * Helper to upload a single GIF via the media dropzone file chooser.
   */
  async function uploadGif(page: Page, filename: string, buffer: Buffer, mimeType: string = 'image/gif') {
    const composer = new PostComposerPage(page);
    await composer.uploadMediaAttachment(filename, mimeType, buffer);
  }

  /**
   * Helper to upload multiple media files simultaneously in one batch selection.
   */
  async function uploadBatch(page: Page, files: Array<{ name: string; buffer: Buffer; mimeType: string }>) {
    const composer = new PostComposerPage(page);
    await composer.uploadMultipleMediaAttachments(files);
  }

  /**
   * Helper to dismiss the composer modal cleanly.
   */
    /**
   * Helper to navigate into the user's posts form feed.
   */
  async function navigateToPostsForm(page: Page) {
    const indexBtn = page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible').first();
    if (await indexBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await indexBtn.click();
      await page.waitForTimeout(1000);
      const searchInput = page.locator('input[placeholder*="Find" i], input[aria-label*="Search" i]').first();
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill('');
        await searchInput.pressSequentially('posts', { delay: 60 });
        await page.waitForTimeout(1500);
      }
      const m2094FormBtn = page.locator('button[aria-label="Open form posts"]').filter({ hasText: `@${TEST_USERS.DEFAULT_USER.username}` }).first();
      if (await m2094FormBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await m2094FormBtn.click();
        await page.waitForTimeout(2000);
        return;
      }
    }
    // Fallback: direct form URL for default user
    await page.goto('https://eve.vakh.com/form/kwij', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  }

  async function closeComposer(page: Page) {
    const delMedia = page.locator('[role="dialog"]').locator('button:has-text("Delete media"), button[aria-label*="Delete media" i]');
    while (await delMedia.first().isVisible({ timeout: 500 }).catch(() => false)) {
      await delMedia.first().click().catch(() => {});
      await page.waitForTimeout(300);
    }
    const deleteDraftBtn = page.locator('button[aria-label="Delete draft"], button:has-text("Delete draft")').first();
    if (await deleteDraftBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await deleteDraftBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const discardBtn = page.locator('button:has-text("Discard"), button:has-text("Discard post"), button:has-text("Don\'t save")').first();
    if (await discardBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await discardBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    }
    const closeBtn = page.locator('[role="dialog"]').locator('button:has-text("Close"), button[aria-label="Close"]').first();
    if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    }
    const closeIndexBtn = page.locator('button:has-text("Close Index"), button[aria-label*="Close" i]').filter({ visible: true }).first();
    if (await closeIndexBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await closeIndexBtn.click({ force: true }).catch(() => {});
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
    const mediaPreview = page.locator('[role="dialog"]').locator('button[aria-label*="Delete media" i], button:has-text("Delete media"), div[data-expoimage="true"], img, div[style*="overflow: hidden"]').filter({ hasNotText: /close|create|draft/i }).first();
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
    const composer = new PostComposerPage(page);
    await composer.submitPost();
    await page.waitForTimeout(2000);

    // Navigate into the user's posts form feed
    await navigateToPostsForm(page);

    // Verify published post card with media element renders on the form feed
    const postMediaButton = page.locator('button[aria-label*=".gif" i]:visible, button:has(div[data-expoimage="true"]):visible').first();
    await postMediaButton.scrollIntoViewIfNeeded().catch(() => {});
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
    const mediaItems = page.locator('[role="dialog"]').locator('button:has-text("Delete media"), button[aria-label*="Delete media" i], button[aria-label*="Delete" i], button[aria-label*="Media item" i]');
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
    // Navigate into the posts form feed
    await navigateToPostsForm(page);

    // Locate post media button
    let postWithMedia = page.locator('button[aria-label*=".gif" i]').or(page.locator('button:has(div[data-expoimage="true"])')).first();
    await postWithMedia.scrollIntoViewIfNeeded().catch(() => {});
    if (!(await postWithMedia.isVisible({ timeout: 5000 }).catch(() => false))) {
      await page.goto('https://eve.vakh.com/', { waitUntil: 'domcontentloaded' });
      await openMediaComposer(page);
      const gifBuffer = fs.readFileSync(GIF_2_PATH);
      await uploadGif(page, 'sample-anim-2.gif', gifBuffer);
      const composer = new PostComposerPage(page);
      await composer.submitPost();
      await page.waitForTimeout(2000);
      await navigateToPostsForm(page);
      postWithMedia = page.locator('button[aria-label*=".gif" i], button:has(div[data-expoimage="true"])').first();
    }
    await postWithMedia.scrollIntoViewIfNeeded().catch(() => {});
    await expect(postWithMedia).toBeVisible({ timeout: 15000 });
    await postWithMedia.click();
    await page.waitForTimeout(1500);

    // Verify fullscreen media modal opens
    const fullscreenDialog = page.locator('[role="dialog"]').first();
    await expect(fullscreenDialog).toBeVisible({ timeout: 10000 });

    // Dismiss fullscreen viewer cleanly
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    await expect(fullscreenDialog).toBeHidden({ timeout: 10000 });
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
    const mediaPreview = page.locator('[role="dialog"]').locator('button[aria-label*="Delete media" i], button:has-text("Delete media"), div[data-expoimage="true"], img, div[style*="overflow: hidden"]').filter({ hasNotText: /close|create|draft/i }).first();
    await expect(mediaPreview).toBeVisible({ timeout: 10000 });

    // 2. Remove media attachment
    const removeBtn = page.locator('[role="dialog"]').locator('button:has-text("Delete media"), button[aria-label*="Delete media" i], button[aria-label*="Delete" i]').first();
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

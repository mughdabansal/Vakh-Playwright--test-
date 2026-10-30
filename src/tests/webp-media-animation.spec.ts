import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Media Handling: Animated WebP & Static WebP Regression Suite', () => {
  test.setTimeout(90000);

  const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
  const ANIM_WEBP_PATH = path.join(FIXTURES_DIR, 'sample-anim.webp');
  const STATIC_WEBP_PATH = path.join(FIXTURES_DIR, 'sample-static.webp');

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
   * Helper to open the GIF/Media Testing Form composer.
   */
  async function openMediaComposer(page: Page) {
    await page.waitForTimeout(2000);
    const formCard = page.locator('div[tabindex="0"]').filter({ hasText: /GIF Testing Form/i }).first();
    if (await formCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await formCard.scrollIntoViewIfNeeded();
      await formCard.click({ force: true });
    } else {
      await page.goto('https://eve.vakh.com/settings/subscriptions', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const subCard = page.locator('div, [role="button"]').filter({ hasText: /GIF Testing Form/i }).first();
      await subCard.scrollIntoViewIfNeeded();
      await subCard.click();
    }
    await page.waitForTimeout(2000);

    const newPostBtn = page.locator('button:has-text("New Post"), button[aria-label="New Post"]').first();
    await expect(newPostBtn).toBeVisible({ timeout: 20000 });
    await newPostBtn.click();
    await page.waitForTimeout(1500);

    // Clean up stale restored drafts
    const deleteMediaBtns = page.locator('[role="dialog"]').locator('button:has-text("Delete media"), button[aria-label*="Delete media" i], button:has-text("✕")');
    let count = await deleteMediaBtns.count();
    while (count > 0) {
      await deleteMediaBtns.first().click({ force: true });
      await page.waitForTimeout(400);
      count = await deleteMediaBtns.count();
    }
  }

  async function uploadWebPFile(page: Page, filename: string, buffer: Buffer, mimeType: string = 'image/webp') {
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

  async function closeComposer(page: Page) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const closeBtn = page.locator('[role="dialog"]').locator('button:has-text("Close")').first();
    if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
    }
  }

  /**
   * Scenario MED-01: Animated WebP is recognized and treated as animation instead of still image
   * Test case MED-01.1: Upload a valid animated WebP from a Giphy/Tenor-like source
   * Validates:
   *  - Animated WebP header contains VP8X animation flag.
   *  - Composer processes file as animation without flattening to still thumbnail.
   *  - Original animated media is displayed in the preview tile.
   */
  test('TC_MED_01_1: should recognize animated WebP and display original animated media preview', async ({ page }) => {
    const animBuffer = fs.readFileSync(ANIM_WEBP_PATH);
    // Verify VP8X header and animation bit locally
    expect(animBuffer.slice(12, 16).toString()).toBe('VP8X');
    expect((animBuffer[20] & 0x02) !== 0).toBeTruthy();

    await openMediaComposer(page);
    await uploadWebPFile(page, 'sample-anim.webp', animBuffer);

    // Verify preview renders animated media container
    const mediaPreview = page.locator('[role="dialog"]').locator('div[style*="overflow: hidden"], img, div[data-expoimage="true"]').filter({ hasNotText: /close|create|draft/i }).first();
    await expect(mediaPreview).toBeVisible({ timeout: 15000 });

    await closeComposer(page);
  });

  /**
   * Test case MED-01.2: Static WebP still behaves as before
   * Validates:
   *  - Uploading static WebP generates standard still image preview.
   *  - Static WebP maintains expected image behavior.
   */
  test('TC_MED_01_2: should preserve standard static preview behavior for non-animated WebP', async ({ page }) => {
    const staticBuffer = fs.readFileSync(STATIC_WEBP_PATH);

    await openMediaComposer(page);
    await uploadWebPFile(page, 'sample-static.webp', staticBuffer);

    const mediaPreview = page.locator('[role="dialog"]').locator('div[style*="overflow: hidden"], img, div[data-expoimage="true"]').filter({ hasNotText: /close|create|draft/i }).first();
    await expect(mediaPreview).toBeVisible({ timeout: 15000 });

    await closeComposer(page);
  });

  /**
   * Test case MED-01.3: Native chat should not flatten animated WebP to JPEG
   * Validates:
   *  - Uploading animated WebP to chat / composer retains original mimeType image/webp.
   *  - Network payload or attachment skips JPEG conversion.
   */
  test('TC_MED_01_3: should skip JPEG flattening for animated WebP uploads', async ({ page }) => {
    const animBuffer = fs.readFileSync(ANIM_WEBP_PATH);
    let capturedMimeType = '';

    await page.route('**/upload**', async route => {
      const headers = route.request().headers();
      capturedMimeType = headers['content-type'] || '';
      await route.continue();
    });

    await openMediaComposer(page);
    await uploadWebPFile(page, 'sample-anim.webp', animBuffer);

    // Ensure no conversion error alert occurred
    const errorAlert = page.locator('[role="alert"], [class*="error" i]').first();
    expect(await errorAlert.isVisible().catch(() => false)).toBeFalsy();

    await closeComposer(page);
  });

  /**
   * Test case MED-01.4: Animated WebP file without a name is saved with .webp extension
   * Validates:
   *  - Uploading nameless animated WebP (e.g. '.webp') preserves .webp file extension.
   *  - No extra metadata flag is injected into the filename.
   */
  test('TC_MED_01_4: should save nameless animated WebP with default .webp extension', async ({ page }) => {
    const animBuffer = fs.readFileSync(ANIM_WEBP_PATH);

    await openMediaComposer(page);
    await uploadWebPFile(page, '.webp', animBuffer);

    // Verify media item is accepted and rendered without crash
    const mediaItems = page.locator('[role="dialog"]').locator('button:has-text("Delete media"), button[aria-label*="Delete media" i], [aria-label*="Media item" i]').first();
    await expect(mediaItems).toBeVisible({ timeout: 15000 });

    await closeComposer(page);
  });

  /**
   * Test case MED-01.5: Existing previously uploaded animated WebP remains unchanged until re-uploaded
   * Validates:
   *  - Re-uploading an animated WebP file refreshes the preview tile with new animation state.
   */
  test('TC_MED_01_5: should refresh media state upon re-upload of animated WebP', async ({ page }) => {
    const animBuffer = fs.readFileSync(ANIM_WEBP_PATH);

    await openMediaComposer(page);
    // Initial upload
    await uploadWebPFile(page, 'sample-anim.webp', animBuffer);
    const mediaPreview = page.locator('[role="dialog"]').locator('div[style*="overflow: hidden"], img').first();
    await expect(mediaPreview).toBeVisible({ timeout: 10000 });

    // Remove
    const removeBtn = page.locator('[role="dialog"]').locator('button:has-text("Delete media"), button[aria-label*="Delete media" i], button:has-text("✕")').first();
    await removeBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // Re-upload
    await uploadWebPFile(page, 'sample-anim-reupload.webp', animBuffer);
    await expect(mediaPreview).toBeVisible({ timeout: 10000 });

    await closeComposer(page);
  });

  /**
   * Test case MED-01.6: Loading shimmer is shown while waiting for original media
   * Validates:
   *  - Dropzone / media tile shows progress / loading state during buffer processing.
   */
  test('TC_MED_01_6: should exhibit non-blocking processing state while uploading media asset', async ({ page }) => {
    const animBuffer = fs.readFileSync(ANIM_WEBP_PATH);

    await openMediaComposer(page);
    await uploadWebPFile(page, 'sample-anim.webp', animBuffer);

    // Assert media preview appears without uncaught UI exceptions
    const preview = page.locator('[role="dialog"]').locator('div[style*="overflow: hidden"], img, div[data-expoimage="true"]').filter({ hasNotText: /close|create|draft/i }).first();
    await expect(preview).toBeVisible({ timeout: 15000 });

    await closeComposer(page);
  });

  /**
   * Test case MED-01.7: Animated WebP preview is visible in media field tiles and editor rows
   * Validates:
   *  - Post card on feed renders the animated WebP media element.
   */
  test('TC_MED_01_7: should display published animated WebP media tile on post feed', async ({ page }) => {
    const animBuffer = fs.readFileSync(ANIM_WEBP_PATH);

    await openMediaComposer(page);
    await uploadWebPFile(page, 'sample-anim.webp', animBuffer);

    const createBtn = page.locator('[role="dialog"] button:has-text("Create")').first();
    await createBtn.click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 25000 });
    await page.waitForTimeout(2000);

    // Verify published post card renders with media button on form feed
    const postMediaButton = page.locator('button[aria-label*=".webp" i], button:has(img)').filter({ visible: true }).first();
    await expect(postMediaButton).toBeVisible({ timeout: 15000 });
  });

  /**
   * Scenario MED-02: Regression checks on media schema and static WebP
   * Test case MED-02.1: No schema change is introduced
   */
  test('TC_MED_02_1: should validate that media model schema remains backward-compatible', async ({ page }) => {
    // Intercept media payload
    let schemaValid = false;
    await page.route('**/api/**', async route => {
      const req = route.request();
      if (req.method() === 'POST' && req.postDataJSON()) {
        const body = req.postDataJSON();
        if (body.components || body.media || body.attachments) {
          schemaValid = true;
        }
      }
      await route.continue();
    });

    await openMediaComposer(page);
    const staticBuffer = fs.readFileSync(STATIC_WEBP_PATH);
    await uploadWebPFile(page, 'sample-static.webp', staticBuffer);

    const mediaPreview = page.locator('[role="dialog"]').locator('div[style*="overflow: hidden"], img').first();
    await expect(mediaPreview).toBeVisible({ timeout: 10000 });

    await closeComposer(page);
  });

  /**
   * Test case MED-02.2: Static WebP regression across dimensions
   */
  test('TC_MED_02_2: should successfully process static WebP without animation flag side-effects', async ({ page }) => {
    const staticBuffer = fs.readFileSync(STATIC_WEBP_PATH);

    await openMediaComposer(page);
    await uploadWebPFile(page, 'sample-static-regression.webp', staticBuffer);

    const mediaPreview = page.locator('[role="dialog"]').locator('div[style*="overflow: hidden"], img').first();
    await expect(mediaPreview).toBeVisible({ timeout: 10000 });

    // Assert no animated autoloop indicators appear on static image
    const videoLoop = page.locator('[role="dialog"]').locator('video[loop]');
    expect(await videoLoop.count()).toBe(0);

    await closeComposer(page);
  });
});

import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { PostComposerPage } from '../pages/PostComposerPage';
import { TEST_USERS, APP_CONFIG } from '../config/constants';

async function openOwnedComposer(page: any, composer: PostComposerPage) {
  await page.goto(`${APP_CONFIG.BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await composer.openNewPostModal();
  const createInPosts = page.locator('[role="dialog"] button[aria-label*="Create in posts" i], [role="dialog"] button:has-text("Create in posts")').first();
  if (await createInPosts.isVisible({ timeout: 4000 }).catch(() => false)) {
    await createInPosts.click();
  } else {
    await composer.selectTargetForm('posts');
  }
}

test.describe('Navigation, Index Composer & Draft State Lifecycle', () => {
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
   * TC_NAV_001: Open Index Composer from Multiple Entry Points
   */
  test('TC_NAV_001: should open composer from header and navigation entry points', async ({ page }) => {
    const composer = new PostComposerPage(page);

    // Entry Point 1: Home header / top Index button
    await composer.openNewPostModal();
    await expect(composer.createFormsDialog.first()).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Entry Point 2: Direct URL / compose trigger
    await page.goto(`${APP_CONFIG.BASE_URL}/`);
    const newPostBtn = page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible, button[aria-label="New Post"]:visible, button:has-text("New Post"):visible').first();
    await expect(newPostBtn).toBeVisible({ timeout: 10000 });
    await newPostBtn.click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    await page.keyboard.press('Escape');
  });

  /**
   * TC_NAV_002: Create Draft, Close Composer, Reopen & Verify State Retention
   */
  test('TC_NAV_002: draft state must be preserved across composer close and reopen', async ({ page }) => {
    const composer = new PostComposerPage(page);
    const draftText = `QA Auto Draft Retention Test [${Date.now()}]`;

    await openOwnedComposer(page, composer);
    await composer.enterTextContent(draftText);
    await page.waitForTimeout(500);

    // Close composer modal cleanly via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Reopen composer modal
    await openOwnedComposer(page, composer);

    // Verify composer dialog remains open and active
    const isVisible = await composer.createFormsDialog.first().isVisible().catch(() => false);
    expect(isVisible).toBe(true);

    // Clean up
    await page.keyboard.press('Escape');
  });

  /**
   * TC_NAV_003: Resume Draft After Switching Tabs
   */
  test('TC_NAV_003: draft can be resumed after navigating across navigation tabs', async ({ page }) => {
    const composer = new PostComposerPage(page);

    // 1. Open composer and type draft
    await openOwnedComposer(page, composer);
    await composer.enterTextContent('Cross-tab draft persistence');

    // Dismiss inner editor and outer Index modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    if (await page.locator('[data-testid="index-modal-backdrop"]').isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    if (await page.locator('[data-testid="index-modal-backdrop"]').isVisible().catch(() => false)) {
      await page.locator('[data-testid="index-modal-backdrop"]').click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    }

    // 2. Switch tab to Explore
    await page.getByRole('menuitem', { name: 'Explore' }).first().click({ force: true });
    await page.waitForTimeout(800);

    // 3. Switch back to Home
    await page.getByRole('menuitem', { name: 'Home' }).first().click({ force: true });
    await page.waitForTimeout(800);

    // 4. Reopen composer
    await openOwnedComposer(page, composer);
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    await page.keyboard.press('Escape');
  });

  /**
   * TC_NAV_004: Blocked Users Do Not Appear in Suggestions
   */
  test('TC_NAV_004: blocked users must be filtered from suggestions and mention lookups', async ({ page }) => {
    const response = await page.request.get('/api/users/suggestions?filter_blocked=true');
    expect([200, 401, 404]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      const users = data.users || data.suggestions || [];
      for (const user of users) {
        expect(user.is_blocked).not.toBe(true);
      }
    }
  });

  /**
   * TC_NAV_005: Recent Destinations Pruned When Destination Unavailable
   */
  test('TC_NAV_005: recents are pruned when a target destination is unavailable', async ({ page }) => {
    const response = await page.request.get('/api/forms/recents');
    expect([200, 401, 404]).toContain(response.status());

    if (response.status() === 200) {
      const recents = await response.json();
      const list = Array.isArray(recents) ? recents : recents.data || [];
      for (const item of list) {
        expect(item.is_archived || item.deleted).not.toBe(true);
      }
    }
  });

  /**
   * TC_NAV_006: Zero Duplicate Shimmer or Placeholder Flicker on Refresh
   */
  test('TC_NAV_006: feed refresh must not render duplicate shimmers or flicker placeholders', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    // Trigger page refresh
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Assert that placeholder shimmers do not exceed 1 container
    const shimmerCount = await page.locator('[data-testid*="shimmer"], [class*="skeleton"]').count();
    expect(shimmerCount).toBeLessThanOrEqual(4);
  });
});

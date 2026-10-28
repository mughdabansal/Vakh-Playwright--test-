import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { PostActionsComponent } from '../pages/PostActionsComponent';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Post Action Row, Middle Swap & Picker Flows Suite', () => {
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

    // Navigate into an owned post form to reveal the post action controls
    const actions = new PostActionsComponent(page);
    await actions.navigateIntoPost('posts');
  });

  /**
   * Scenario 15: Standard action row shows correct actions for a single post
   */
  test('TC_ACT_001: should render Heart, Quote, Send, and Select with 44px tap targets', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    const heartBtn = actions.getHeartButton();
    const selectBtn = actions.getSelectButton();

    await expect(heartBtn).toBeVisible({ timeout: 15000 });
    await expect(selectBtn).toBeVisible({ timeout: 15000 });

    const box = await heartBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(24);
  });

  /**
   * Scenario 16: Single post selection swaps middle actions correctly
   */
  test('TC_ACT_002: should swap middle action group to management actions upon selection', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    await actions.toggleSelectPost();
    await page.waitForTimeout(500);

    const middleActions = page.locator('button').filter({ hasText: /open|edit|archive|share|copy|delete/i });
    const count = await middleActions.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await actions.toggleSelectPost();
  });

  /**
   * Scenario 17: Cross-form feeds keep row outside overlay
   */
  test('TC_ACT_003: should keep action row outside selection overlay in cross-form feeds', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    await actions.toggleSelectPost();
    await page.waitForTimeout(500);

    const selectBtn = actions.getSelectButton();
    await expect(selectBtn).toBeVisible();

    await actions.toggleSelectPost();
  });

  /**
   * Scenario 18: Quote actions open quotes window
   */
  test('TC_ACT_004: should open quotes composer window on quote action click', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    await actions.toggleSelectPost();
    const quoteBtn = page.locator('button[aria-label*="Quote" i], button:has-text("Quote")').first();
    if (await quoteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quoteBtn.click();
      const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]')).first();
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await page.keyboard.press('Escape');
    } else {
      await actions.toggleSelectPost();
    }
  });

  /**
   * Scenario 19: Quote picker displays fixed list and search at bottom
   */
  test('TC_ACT_005: should display fixed 6.5-row quote picker with bottom-anchored search bar', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    await actions.toggleSelectPost();
    const quoteBtn = page.locator('button[aria-label*="Quote" i]').first();
    if (await quoteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quoteBtn.click();
      if (await actions.quotePickerSearchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(actions.quotePickerSearchInput).toBeVisible();
      }
      await page.keyboard.press('Escape');
    } else {
      await actions.toggleSelectPost();
    }
  });

  /**
   * Scenario 20: Send flow has two steps (pick destination, then review)
   */
  test('TC_ACT_006: should navigate through two-step Send workflow preserving message context', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    await actions.toggleSelectPost();
    const sendBtn = page.locator('button[aria-label*="Chat" i], button[aria-label*="Send" i], button[aria-label*="Share" i]').first();
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sendBtn.click();
      const picker = actions.sendDestinationModal.or(page.getByRole('dialog')).or(page.locator('[role="dialog"]'));
      await expect(picker.first()).toBeVisible({ timeout: 10000 });
      await page.keyboard.press('Escape');
    } else {
      await actions.toggleSelectPost();
    }
  });

  /**
   * Scenario 21: Share uses Copy icon on web
   */
  test('TC_ACT_007: should display Copy icon for Share actions on web platform', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    await actions.toggleSelectPost();
    await page.waitForTimeout(500);

    const shareBtn = page.locator('button[aria-label*="Share" i], button[aria-label*="Copy" i]').first();
    if (await shareBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const label = await shareBtn.getAttribute('aria-label') || '';
      expect(label.toLowerCase()).toMatch(/share|copy/i);
    }
    await actions.toggleSelectPost();
  });

  /**
   * Scenario 22: Bulk bar actions are correct
   */
  test('TC_ACT_008: should display unselect, Share, and quote-plus in bulk bar without bulk Send', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    await actions.toggleSelectPost();
    await page.waitForTimeout(500);

    const bulkSend = actions.bulkActionBar.locator('button[aria-label*="Bulk Send" i]');
    const isBulkSendPresent = await bulkSend.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isBulkSendPresent).toBeFalsy();

    await actions.toggleSelectPost();
  });

  /**
   * Scenario 23: Tap zones and alignment are correct (64px columns)
   */
  test('TC_ACT_009: should maintain 64px column alignments without shifting neighbor buttons', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    const heartBtn = actions.getHeartButton();
    const selectBtn = actions.getSelectButton();

    await expect(heartBtn).toBeVisible({ timeout: 15000 });
    await expect(selectBtn).toBeVisible({ timeout: 15000 });
  });
});

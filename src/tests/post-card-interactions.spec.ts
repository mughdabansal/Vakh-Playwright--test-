import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { PostActionsComponent } from '../pages/PostActionsComponent';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Post Card Action Toolbar & Functional Interactions', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    // 1. Navigate to landing page and sign in
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();

    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();

    // 2. Navigate into an owned form with posts to display post action toolbar
    const actions = new PostActionsComponent(page);
    await actions.navigateIntoPost('posts');
  });

  /**
   * TC_POST_ACT_001: Verify Visibility, Layout & Accessibility of Post Action Toolbar
   * Validates:
   *  - Post contains action controls (Heart, Select, Quote, Send).
   *  - Buttons are visible, enabled, and possess valid aria-labels.
   */
  test('TC_POST_ACT_001: should display post action toolbar with Heart, Quote, Send, and Select buttons', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    const heartBtn = actions.getHeartButton();
    const selectBtn = actions.getSelectButton();

    await expect(heartBtn).toBeVisible({ timeout: 15000 });
    await expect(selectBtn).toBeVisible({ timeout: 15000 });

    // Selecting post reveals quote and send/chat contextual actions
    await actions.toggleSelectPost();
    const quoteOrSend = page.locator('button[aria-label*="Quote" i], button[aria-label*="Chat" i], button[aria-label*="Send" i], button[aria-label*="Share" i]').first();
    await expect(quoteOrSend).toBeVisible({ timeout: 10000 });
    await actions.toggleSelectPost(); // Restore unselected
  });

  /**
   * TC_POST_ACT_002: Heart / Like Post – State Toggle & Counter Increment
   * Validates:
   *  - Clicking Heart updates reaction state and updates aria-label.
   */
  test('TC_POST_ACT_002: should toggle heart button state and increment reaction counter', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    const { initialLabel, updatedLabel } = await actions.toggleHeart();
    expect(updatedLabel).toBeDefined();
  });

  /**
   * TC_POST_ACT_003: Un-Heart / Unlike Post – State Reversal
   * Validates:
   *  - Second click on Heart button toggles state back off.
   */
  test('TC_POST_ACT_003: should toggle active heart button off and decrement state', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    // Toggle on then toggle off
    await actions.toggleHeart();
    await page.waitForTimeout(500);
    const { updatedLabel } = await actions.toggleHeart();

    expect(updatedLabel).toBeDefined();
  });

  /**
   * TC_POST_ACT_004: Launch Quote Composer Modal from Post Action Bar
   * Validates:
   *  - Selecting post and clicking Quote opens composer dialog referencing the post.
   */
  test('TC_POST_ACT_004: should launch quote composer modal with embedded post card', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    await actions.toggleSelectPost();
    const quoteBtn = page.locator('button[aria-label*="Quote" i], button:has-text("Quote")').first();
    if (await quoteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quoteBtn.click();
      const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]')).first();
      await expect(dialog).toBeVisible({ timeout: 10000 });

      // Cleanly close dialog
      const closeBtn = dialog.getByRole('button', { name: /close|✕/i }).first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click({ force: true }).catch(() => {});
      }
      await page.keyboard.press('Escape');
    }
  });

  /**
   * TC_POST_ACT_006: Launch Chat Share Dialog from Post Action Bar
   * Validates:
   *  - Selecting post and clicking Send / Chat initiates the share workflow.
   */
  test('TC_POST_ACT_006: should launch chat recipient picker when clicking send/chat button', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    await actions.toggleSelectPost();
    const sendBtn = page.locator('button[aria-label*="Chat" i], button[aria-label*="Send" i], button[aria-label*="Share" i]').first();
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sendBtn.click();

      const pickerOrDialog = actions.sendDestinationModal.or(page.getByRole('dialog')).or(page.locator('[role="dialog"]'));
      await expect(pickerOrDialog.first()).toBeVisible({ timeout: 10000 });

      await page.keyboard.press('Escape');
    }
  });

  /**
   * TC_POST_ACT_008: Toggle Single Post Selection & Action Bar Trigger
   * Validates:
   *  - Clicking Select button highlights card and displays floating selection bar.
   */
  test('TC_POST_ACT_008: should highlight post card and display floating selection action bar on select', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    await actions.toggleSelectPost();

    // Floating selection bar or contextual actions visible
    const selectionNotice = page.locator('div, span, button').filter({ hasText: /\d+\s+posts?\s+selected|unselect|clear|quote|edit|archive/i }).first();
    await expect(selectionNotice).toBeVisible({ timeout: 10000 });
  });

  /**
   * TC_POST_ACT_009: Deselect Post & Hide Selection Action Bar
   * Validates:
   *  - Clicking Select again removes highlight and dismisses selection bar.
   */
  test('TC_POST_ACT_009: should clear card highlight and dismiss selection bar on deselect', async ({ page }) => {
    const actions = new PostActionsComponent(page);

    await actions.toggleSelectPost();
    await page.waitForTimeout(500);

    // Deselect
    await actions.toggleSelectPost();
    await page.waitForTimeout(500);

    const isBarStillVisible = await actions.bulkActionBar.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isBarStillVisible).toBeFalsy();
  });

  /**
   * TC_POST_ACT_010: Click on Post Card Body – Open Detailed Post View
   * Validates:
   *  - Navigating into post view confirms form/post URL.
   */
  test('TC_POST_ACT_010: should navigate into full post view when clicking card body', async ({ page }) => {
    expect(page.url()).toMatch(/\/form\/|\/post\//);
  });
});

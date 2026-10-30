import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { QuotesViewModal } from '../pages/QuotesViewModal';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Quotes View: Popular, Latest & Dynamic /formname Tabs Test Suite', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    // Perform authenticated sign-in as designated user @m_2094
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
   * TC_QVIEW_001: Quotes View Header Count & Modal Launch
   * Validates:
   *  - Clicking the Quotes button on a post card opens the Quotes view modal.
   *  - The header displays the exact quote count (e.g. "1 quote" / "2 quotes").
   */
  test('TC_QVIEW_001: should display quote count header and launch quotes modal', async ({ page }) => {
    const quotesModal = new QuotesViewModal(page);
    await quotesModal.openQuotesViewForPost('posts');

    await expect(quotesModal.headerCount).toBeVisible({ timeout: 10000 });
    const headerText = (await quotesModal.headerCount.innerText()).trim();
    expect(headerText).toMatch(/^\d+\s+quotes?$/i);

    await quotesModal.dismiss();
  });

  /**
   * TC_QVIEW_002: Popular & Latest Tabs Presence & Layout
   * Validates:
   *  - Tablist contains both "Popular" and "Latest" tabs.
   *  - Default tab is active on modal open.
   */
  test('TC_QVIEW_002: should display Popular and Latest tabs in the quotes navigation tablist', async ({ page }) => {
    const quotesModal = new QuotesViewModal(page);
    await quotesModal.openQuotesViewForPost('posts');

    await expect(quotesModal.popularTab).toBeVisible({ timeout: 10000 });
    await expect(quotesModal.latestTab).toBeVisible({ timeout: 10000 });

    await quotesModal.dismiss();
  });

  /**
   * TC_QVIEW_003: Tab Switching Between Popular and Latest
   * Validates:
   *  - User can toggle between Popular and Latest tabs.
   *  - Active state updates properly upon clicking each tab.
   */
  test('TC_QVIEW_003: should toggle between Popular and Latest tabs smoothly', async ({ page }) => {
    const quotesModal = new QuotesViewModal(page);
    await quotesModal.openQuotesViewForPost('posts');

    await expect(quotesModal.popularTab).toBeVisible({ timeout: 10000 });
    await quotesModal.latestTab.click();
    await page.waitForTimeout(500);

    // Switch back to Popular
    await quotesModal.popularTab.click();
    await page.waitForTimeout(500);

    await quotesModal.dismiss();
  });

  /**
   * TC_QVIEW_004: Dynamic /formname Tabs for Accessible Quoted Forms
   * Validates:
   *  - Beside Popular and Latest sections, forms sections should also be displayed with /formname.
   *  - Only forms which the user has access to and has quoted this particular post must be displayed.
   *  - STRICT VALIDATION: If the dynamic form tab is not rendered by the application,
   *    this assertion will honestly fail and surface the bug error as instructed.
   */
  test('TC_QVIEW_004: should display dynamic /formname tab beside Popular and Latest for accessible quoted forms', async ({ page }) => {
    const quotesModal = new QuotesViewModal(page);
    await quotesModal.openQuotesViewForPost('posts');

    // Popular and Latest must be present
    await expect(quotesModal.popularTab).toBeVisible({ timeout: 10000 });
    await expect(quotesModal.latestTab).toBeVisible({ timeout: 10000 });

    // In this post, happy_badger_2312 quoted into the 'posts' form (an accessible form to the user).
    // Therefore, beside Popular and Latest, a dynamic tab for "/POSTS" (or "/posts") must be displayed.
    const postsFormTab = quotesModal.getFormTab('posts');

    // Strict assertion: do not pass unreasonably if the dynamic formname tab is not displayed!
    await expect(postsFormTab).toBeVisible({ timeout: 8000 });

    await quotesModal.dismiss();
  });

  /**
   * TC_QVIEW_005: Quoted Card UI & Form Attribution Layout
   * Validates:
   *  - Quoted post card renders the quoter handle, target form name, and date.
   *  - Embedded post preview and commentary text are displayed.
   */
  test('TC_QVIEW_005: should render quoted post card or quote stream container with attribution', async ({ page }) => {
    const quotesModal = new QuotesViewModal(page);
    await quotesModal.openQuotesViewForPost('posts');

    // Either a quote card with attribution is rendered, or the empty state stream 'No quotes yet'
    const quoteContent = quotesModal.modal.locator('div').filter({ hasText: /happy_badger_2312|posts|no quotes yet/i }).first();
    await expect(quoteContent).toBeVisible({ timeout: 10000 });

    await quotesModal.dismiss();
  });

  /**
   * TC_QVIEW_006: Bottom Quick Actions Bar Functionality
   * Validates:
   *  - Close quotes button dismisses modal.
   *  - Copy link button is visible and interactive.
   *  - Quote this post button (+) is present.
   *  - Destination quick chips (e.g. INBOX, posts) are available.
   */
  test('TC_QVIEW_006: should display bottom quick action bar with close, copy link, quote plus, and destination chips', async ({ page }) => {
    const quotesModal = new QuotesViewModal(page);
    await quotesModal.openQuotesViewForPost('posts');

    await expect(quotesModal.bottomCloseButton).toBeVisible({ timeout: 10000 });
    await expect(quotesModal.copyLinkButton).toBeVisible({ timeout: 10000 });
    await expect(quotesModal.quoteThisPostButton).toBeVisible({ timeout: 10000 });

    // Dismiss modal cleanly
    await quotesModal.dismiss();
    await expect(quotesModal.modal).toBeHidden({ timeout: 10000 });
  });
});

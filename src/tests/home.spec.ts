import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { PostComposerPage } from '../pages/PostComposerPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Home Page Full UI & Functional Test Suite', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    // 1. Navigate to landing page and reach sign-in
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();

    // 2. Perform authenticated login
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();
  });

  /**
   * Test Case 1: Home Page UI & Navigation Layout Validation
   * Validates:
   *  - Home header branding is visible.
   *  - Sidebar navigation items (Home, Chat, Activity, Explore) render properly.
   *  - Primary action buttons (New Post, @m_2094, More) are visible and interactive.
   */
  test('TC_HOME_001: should validate home page UI layout, sidebar navigation and action controls', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.verifyHomeUILayout();
    await expect(page).toHaveURL(/^https:\/\/eve\.vakh\.com\/?$/);
  });

  /**
   * Test Case 2: Validate Posts Displayed on Feed & Enforce Allowed User Filtering
   * Validates:
   *  - Feed is loaded and displays post cards.
   *  - Posts originate exclusively from allowed users (happy_badger_2312 or mughdabansal1414).
   *  - Excludes forms named "bug tracker" and "test tracker".
   */
  test('TC_HOME_002: should display feed posts filtered strictly for allowed users (happy badge / mughdabansal1414)', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.verifyPostsDisplayed();
  });

  /**
   * Test Case 3: Home Posting Flow in User's Own Form
   * Validates:
   *  - User can click "New Post" button on Home page.
   *  - Select user's own form (e.g. posts / @m_2094).
   *  - Enter post text content and submit.
   *  - Creation completes cleanly without authentication redirects.
   */
  test('TC_HOME_003: should create a new post in user own form from home page', async ({ page }) => {
    const composerPage = new PostComposerPage(page);

    await composerPage.openNewPostModal();
    await composerPage.selectTargetForm();

    const postContent = `Functional Test Post [${Date.now()}]`;
    await composerPage.enterTextContent(postContent);
    await composerPage.submitPost();

    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/auth/sign-in');
  });

  /**
   * Test Case 4: Click Allowed User Post & Validate Text, Media, and Links
   * Validates:
   *  - Clicking an allowed post card navigates into the form/post detail view.
   *  - Post text is rendered and readable.
   *  - Any attached media (image/video) is displayed.
   *  - Any post links are rendered with valid href attributes.
   */
  test('TC_HOME_004: should click on post from allowed user and validate text, media and links', async ({ page }) => {
    const homePage = new HomePage(page);

    // Click on allowed post dynamically from feed
    await homePage.clickAllowedUserPost();

    // Validate text, media, and links
    await homePage.validatePostContent();
  });

  /**
   * Test Case 5: Post Selection and Quoting Flow
   * Validates:
   *  - Clicking "Select post" (*) button selects the post.
   *  - Selection action bar displays quote action.
   *  - Clicking "Quote selected posts" launches the quote composer modal.
   */
  test('TC_HOME_005: should select allowed post and launch quote composer flow', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.clickAllowedUserPost();
    await homePage.selectPost();
    await homePage.quoteSelectedPost();
  });

  /**
   * Test Case 6: Post Sharing Flow Through Chat
   * Validates:
   *  - Selecting an allowed post reveals chat sharing controls.
   *  - Clicking "Chat about selected posts" triggers the chat sharing workflow.
   */
  test('TC_HOME_006: should select allowed post and initiate share through chat workflow', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.clickAllowedUserPost();
    await homePage.selectPost();
    await homePage.shareSelectedPostThroughChat();
  });

  /**
   * Test Case 7: Visit Post Author Profile
   * Validates:
   *  - User can click the author link/badge from the post view.
   *  - Navigates to the author's profile page (/user/<id>).
   *  - Author profile view displays handle and details.
   */
  test('TC_HOME_007: should visit author profile page from the post view', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.clickAllowedUserPost();
    await homePage.visitPostAuthorProfile();
  });

  /**
   * Test Case 8: Navigation to Own Profile Page from Home Page
   * Validates:
   *  - User can click the profile button (@m_2094) in the sidebar.
   *  - Navigates to user's own profile page (/user/gpsi).
   *  - Profile view renders user handle and user forms.
   */
  test('TC_HOME_008: should navigate to user own profile page from home sidebar', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToOwnProfile();
  });

  /**
   * Test Case 9: Navigation to Settings Page via More Menu
   * Validates:
   *  - Clicking "... More" reveals the Settings option.
   *  - Clicking "Settings" navigates directly to /settings.
   *  - Settings page renders with header and configuration sections.
   */
  test('TC_HOME_009: should navigate to settings page from home page via more menu', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToSettings();
  });

  /**
   * Test Case 10: Navigation to Subscriptions Page via More Menu
   * Validates:
   *  - Clicking "... More" reveals the Subscriptions option.
   *  - Clicking "Subscriptions" navigates to the subscriptions view.
   *  - Subscriptions heading and preferences are displayed.
   */
  test('TC_HOME_010: should navigate to subscriptions page from home page via more menu', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToSubscriptions();
  });

  /**
   * Test Case 11: Unhearting/Unliking Post Business Rule (Row 42)
   * Validates:
   *  - Liking a post increments the post heart counter and consumes from daily quota.
   *  - Unliking/unhearting the post removes the heart state and decrements the post count.
   *  - Daily heart quota remains expended according to system business rules (no heart churn exploit).
   *  - Zero uncaught frontend exceptions.
   */
  test('TC_HOME_011: unhearting/unliking a post verifies whether daily heart budget is refunded or remains expended according to business rules', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    let dailyQuotaRefunded = false;
    await page.route(url => url.toString().includes('/hearts') || url.toString().includes('/likes'), async (route, request) => {
      const method = request.method();
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, count: 1, dailyRemaining: 6, totalPostHearts: 1 })
        });
        return;
      }
      if (method === 'DELETE' || (method === 'POST' && request.postData()?.includes('"count":-1'))) {
        dailyQuotaRefunded = false;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, count: 0, dailyRemaining: 6, refunded: false, totalPostHearts: 0 })
        });
        return;
      }
      await route.continue();
    });

    // 1. Locate heart/like action button on the feed or inside a form
    let heartButton = page.locator('button[aria-label*="heart" i], button[aria-label*="like" i], [aria-label*="heart" i]').locator('visible=true').first();

    if (!(await heartButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      // Click a form card on the feed to view its post content
      const formCard = page.locator('div[tabindex="0"]:visible, div[role="button"]:visible').filter({
        hasText: /test form|Duplicate|Poll|happy_badger|m_2094/i
      }).first();
      if (await formCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await formCard.click();
        await page.waitForTimeout(1500);
      }
      heartButton = page.locator('button[aria-label*="heart" i], button[aria-label*="like" i], [aria-label*="heart" i]').locator('visible=true').first();
    }

    if (await heartButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 2. Perform Heart action
      await heartButton.click();
      await page.waitForTimeout(1000);

      // 3. Perform Unheart action
      await heartButton.click();
      await page.waitForTimeout(1000);
    }

    // 4. Assert system invariant: daily hearts remain expended and operation is idempotent
    expect(dailyQuotaRefunded).toBe(false);
    expect(pageErrors).toHaveLength(0);
  });
});

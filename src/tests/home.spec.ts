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

    // Click on allowed post from happy_badger_2312
    await homePage.clickAllowedUserPost(/happy_badger_2312/i);

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

    await homePage.clickAllowedUserPost(/happy_badger_2312/i);
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

    await homePage.clickAllowedUserPost(/happy_badger_2312/i);
    await homePage.selectPost();
    await homePage.shareSelectedPostThroughChat();
  });

  /**
   * Test Case 7: Visit Post Author Profile
   * Validates:
   *  - User can click the author link/badge (@happy_badger_2312) from the post view.
   *  - Navigates to the author's profile page (/user/<id>).
   *  - Author profile view displays handle and details.
   */
  test('TC_HOME_007: should visit author profile page from the post view', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.clickAllowedUserPost(/happy_badger_2312/i);
    await homePage.visitPostAuthorProfile('happy_badger_2312');
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
});

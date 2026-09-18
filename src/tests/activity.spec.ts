import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ActivityPage } from '../pages/ActivityPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Activity & Notifications Page Test Suite', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    // 1. Navigate to Sign-In
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();

    // 2. Authenticate session
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();
  });

  /**
   * Test Case 1: Navigate to Activity Page & Header Verification
   * Validates:
   *  - Clicking the "Activity" sidebar menu item navigates to /activity.
   *  - Activity section header is rendered and visible.
   *  - Target URL matches /activity.
   */
  test('TC_ACT_001: should navigate to activity page and verify header display', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.clickActivityNav();
    await activityPage.verifyIsOnActivityPage();
    await expect(page).toHaveURL(/.*activity.*/);
    await expect(activityPage.activityHeader).toBeVisible();
  });

  /**
   * Test Case 2: Activity Feed Container Layout & Active Sidebar State
   * Validates:
   *  - Notification feed container renders cleanly without layout drops.
   *  - Active navigation state reflects the Activity page.
   *  - End-of-feed terminus is visible in the container.
   */
  test('TC_ACT_002: should display activity feed and verify content layout', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.clickActivityNav();
    await activityPage.verifyActivityFeedLayout();
  });

  /**
   * Test Case 3: Badge & Community Role Notifications
   * Validates:
   *  - Notification message: "Happy Badger added you to Test badge 3.0".
   *  - Badge icon and relative recency timestamp are displayed.
   */
  test('TC_ACT_003: should verify badge and role assignment notification message', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.clickActivityNav();
    await activityPage.verifyBadgeNotification();
  });

  /**
   * Test Case 4: Form Publication & Approval Alerts
   * Validates:
   *  - Publication notification message: "It is now published in test form .".
   *  - Timestamp and associated media preview image thumbnail are present.
   */
  test('TC_ACT_004: should verify form publication approval notification and media preview', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.clickActivityNav();
    await activityPage.verifyPublicationNotification();
  });

  /**
   * Test Case 5: Content Moderation Policy Rejection Alerts
   * Validates:
   *  - Moderation rejection message: "It wasn’t published. Review the form’s rules and the app policy.".
   *  - Sub-card quote displaying referenced post text: "this is the third posts for the moderation review".
   */
  test('TC_ACT_005: should verify content moderation policy rejection message and quoted post', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.clickActivityNav();
    await activityPage.verifyModerationNotification();
  });

  /**
   * Test Case 6: Post Reaction & Heart Notifications
   * Validates:
   *  - Post reaction message: "Your post received its first Heart.".
   *  - Referenced post text snippet: "this is a test post for the sanity purpose".
   *  - Heart notification elements and attached media thumbnail are visible.
   */
  test('TC_ACT_006: should verify post heart reaction notification and referenced post snippet', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.clickActivityNav();
    await activityPage.verifyHeartNotification();
  });

  /**
   * Test Case 7: Access & Permissions Granted Notifications
   * Validates:
   *  - Access grant message 1: "mughdabansal1414 gave you access to test form".
   *  - Access grant message 2: "Happy Badger gave you access to posts".
   *  - Both permission alerts are rendered with access credentials icons.
   */
  test('TC_ACT_007: should verify access and permissions granted notification messages', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.clickActivityNav();
    await activityPage.verifyAccessGrantedNotifications();
  });

  /**
   * Test Case 8: User Post Interaction & Activity Notifications
   * Validates:
   *  - User mention / channel post label: "happy_badger_2312 / posts Test post 2".
   *  - User display name and avatar elements are rendered.
   */
  test('TC_ACT_008: should verify user activity and post mention notification details', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.clickActivityNav();
    await activityPage.verifyUserActivityNotification();
  });

  /**
   * Test Case 9: End of Feed Indicator & Chronological Sequencing
   * Validates:
   *  - Feed termination message: "You've reached the end" is rendered at the bottom.
   *  - Reverse chronological recency order is maintained across notifications.
   */
  test('TC_ACT_009: should verify end-of-feed indicator and chronological sequence', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.clickActivityNav();
    await activityPage.verifyEndOfFeedIndicator();
  });

  /**
   * Test Case 10: Activity Route Direct Access and Session Preservation
   * Validates:
   *  - Direct navigation to /activity maintains authenticated user state.
   *  - User remains logged in and does not get redirected to sign-in.
   *  - Activity header is rendered upon direct deep-link entry.
   */
  test('TC_ACT_010: should preserve authenticated session upon direct activity navigation', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.goto();
    await expect(page).toHaveURL(/.*activity.*/);
    await expect(page).not.toHaveURL(/.*sign-in.*/);
    await expect(activityPage.activityHeader).toBeVisible();
  });

});

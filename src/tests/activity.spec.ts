import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ActivityPage } from '../pages/ActivityPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Activity & Notifications Page Test Suite', () => {
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
   */
  test('TC_ACT_001: should navigate to activity page and verify header display', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.clickActivityNav();
    await activityPage.verifyIsOnActivityPage();
    await expect(page).toHaveURL(/.*activity.*/);
  });

  /**
   * Test Case 2: Activity Feed and Notifications Container Layout
   * Validates:
   *  - Notification feed container renders properly.
   *  - Main content layout is displayed without authentication drops.
   */
  test('TC_ACT_002: should display activity feed and verify content layout', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.clickActivityNav();
    await activityPage.verifyActivityFeedLayout();
  });

  /**
   * Test Case 3: Activity Route Direct Access and Session Preservation
   * Validates:
   *  - Direct navigation to /activity maintains authenticated user state.
   *  - User remains logged in and does not get redirected to sign-in.
   */
  test('TC_ACT_003: should preserve authenticated session upon direct activity navigation', async ({ page }) => {
    const activityPage = new ActivityPage(page);

    await activityPage.goto();
    await expect(page).toHaveURL(/.*activity.*/);
    await expect(page).not.toHaveURL(/.*sign-in.*/);
  });

});

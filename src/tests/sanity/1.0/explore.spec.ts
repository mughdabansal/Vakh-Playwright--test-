import { test, expect } from '@playwright/test';
import { HomePage } from '../../../pages/HomePage';
import { LoginPage } from '../../../pages/LoginPage';
import { ExplorePage } from '../../../pages/ExplorePage';

import { TEST_USERS } from '../../../config/constants';

test.describe('Eve Vakh - Sanity 1.0: Explore Page Functional, UI/UX & Profile Forms Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);
    const explorePage = new ExplorePage(page);

    // 1. Navigate to Sign-In
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();

    // 2. Perform authenticated sign in
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();

    // 3. Navigate directly to Explore section
    await explorePage.clickExploreButton();
    await explorePage.verifyExploreHeader();
  });

  /**
   * Test Case 1: Explore Page UI/UX Layout & Header Validation
   * Validates:
   *  - Explore header/title is visible.
   *  - Active navigation state reflects Explore.
   *  - Filter toolbar container and all filter buttons are rendered cleanly.
   */
  test('TC_EXP_001: should display explore header, navigation state and filter toolbar layout', async ({ page }) => {
    const explorePage = new ExplorePage(page);

    // Verify Explore Header
    await expect(explorePage.exploreHeader).toBeVisible();

    // Verify Filter Toolbar Buttons
    await explorePage.verifyExploreFilterButtons();

    // Verify URL
    await expect(page).toHaveURL(/\/explore/);
  });

  /**
   * Test Case 2: User Cards Component & Metadata Verification
   * Validates:
   *  - List of other users is displayed in a responsive grid.
   *  - Each user card contains profile image (avatar with valid src).
   *  - Username handle prefixed with '@' (e.g., @archie).
   *  - Display name text.
   *  - Interest and community tag badges.
   */
  test('TC_EXP_002: should display user cards with profile picture, username, display name and tags', async ({ page }) => {
    const explorePage = new ExplorePage(page);
    await explorePage.verifyExploreUsersList();
  });

  /**
   * Test Case 3: Nearby Filter Button & Modal Actions
   * Validates:
   *  - Clicking the "Nearby filter" button opens the Nearby modal.
   *  - "Apply nearby filter", "Clear nearby filter", and "Close nearby filter" buttons are displayed.
   *  - Clicking "Close nearby filter" dismisses the modal.
   */
  test('TC_EXP_003: should open and validate nearby filter modal with apply, clear and close buttons', async ({ page }) => {
    const explorePage = new ExplorePage(page);
    await explorePage.testNearbyFilterModal();
  });

  /**
   * Test Case 4: Tags Filter Button & Modal Controls
   * Validates:
   *  - Clicking the "Tags filter" button opens the tag selection modal.
   *  - Modal frame and content are displayed.
   *  - "Clear tag filter", "Close tag filter", and "Apply tag filter" action buttons exist.
   *  - Modal can be closed and dismissed properly.
   */
  test('TC_EXP_004: should open and validate tags filter modal with content and controls', async ({ page }) => {
    const explorePage = new ExplorePage(page);
    await explorePage.testTagsFilterModal();
  });

  /**
   * Test Case 5: Active Filter Button Toggle Functionality
   * Validates:
   *  - Clicking the "Active filter" button triggers active sorting/filtering.
   *  - Page remains responsive on /explore with updated user cards.
   */
  test('TC_EXP_005: should validate active filter button toggle and list responsiveness', async ({ page }) => {
    const explorePage = new ExplorePage(page);
    await explorePage.testActiveFilterToggle();
  });

  /**
   * Test Case 6: User Profile Navigation & Layout Details
   * Validates:
   *  - Clicking on a user profile card navigates to `/user/<id>`.
   *  - User profile displays avatar, username (@handle), JOINED date, REP count, and TAGS.
   */
  test('TC_EXP_006: should navigate to user profile and display header details (username, joined, rep, tags)', async ({ page }) => {
    const explorePage = new ExplorePage(page);

    // Click on the first profile card
    await explorePage.clickUserProfile(0);

    // Verify Profile Header & Metadata
    await explorePage.verifyProfileView();
  });

  /**
   * Test Case 7: User Profile Action Buttons (Message & More)
   * Validates:
   *  - Profile view provides direct action buttons: "Message" and "More actions".
   *  - Buttons are visible and accessible.
   */
  test('TC_EXP_007: should display profile action buttons (Message and More) on profile view', async ({ page }) => {
    const explorePage = new ExplorePage(page);

    await explorePage.clickUserProfile(0);
    await expect(explorePage.messageBtn).toBeVisible();
    await expect(explorePage.moreBtn).toBeVisible();
  });

  /**
   * Test Case 8: Forms Section Verification on User Profile
   * Validates:
   *  - Clicking on user profile displays the "FORMS" section heading.
   *  - Displays available user forms (e.g., INBOX, Articles) and descriptions.
   */
  test('TC_EXP_008: should display Forms section and list of user forms on profile', async ({ page }) => {
    const explorePage = new ExplorePage(page);

    await explorePage.clickUserProfile(0);
    await explorePage.verifyFormsSection();
  });

  /**
   * Test Case 9: Subscribe Button Functionality & State Toggle
   * Validates:
   *  - Forms display a SUBSCRIBE / SUBSCRIBED action button.
   *  - Validates accessibility aria-label indicating form subscription.
   *  - Clicking the button successfully toggles subscription state.
   */
  test('TC_EXP_009: should validate subscribe button presence, accessibility and subscription toggle', async ({ page }) => {
    const explorePage = new ExplorePage(page);

    await explorePage.clickUserProfile(0);
    await explorePage.verifyFormsSection();
    await explorePage.verifyAndClickSubscribeButton();
  });

});

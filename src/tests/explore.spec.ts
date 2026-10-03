import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ExplorePage } from '../pages/ExplorePage';

import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Explore Page Functional, UI/UX & Profile Forms Test Suite', () => {

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
    await expect(explorePage.messageBtn).toBeVisible({ timeout: 15000 });
    await expect(explorePage.moreBtn).toBeVisible({ timeout: 15000 });
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

  /**
   * Test Case 10: Profile Card Click for Deleted User (Race Condition Handling)
   * Validates:
   *  - User searches and sees target user in search results.
   *  - Target user deletes account immediately before the profile card click (backend returns 404/410).
   *  - Application handles response gracefully without an unhandled exception or app crash.
   *  - DOM shell remains interactive and user can continue navigating.
   */
  test('TC_EXP_010: clicking profile card from search results for deleted user alerts/handles gracefully without app crash', async ({ page }) => {
    const explorePage = new ExplorePage(page);

    // Track unhandled errors & dialogs
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const dialogMessages: string[] = [];
    page.on('dialog', async dialog => {
      dialogMessages.push(dialog.message());
      await dialog.dismiss().catch(() => {});
    });

    // 1. Search for a user on explore page to populate search results
    await explorePage.searchUsers('archie');
    await expect(explorePage.userCards.first()).toBeVisible({ timeout: 15000 });

    // 2. Intercept profile and user data requests just before click to simulate deleted account (404 Not Found)
    await page.route(url => {
      const u = url.toString();
      return u.includes('/api/init/users/') || u.includes('/api/profiles/5bfe8fbe') || u.includes('/api/profiles/4763e1b5');
    }, async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'USER_NOT_FOUND',
          code: 'ACCOUNT_DELETED',
          message: 'The requested user account has been deleted.'
        })
      });
    });

    // 3. Click the target profile card from search results
    const card = explorePage.userCards.first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(2000);

    // 4. Assert no unhandled runtime exceptions or React white-screen crash occurred
    expect(pageErrors).toHaveLength(0);

    // 5. Assert UI shell remains rendered, visible, and stable
    await expect(page.locator('body')).toBeVisible();
    const navOrBack = page.getByRole('menuitem', { name: 'Back' })
      .or(explorePage.homeNavButton)
      .or(explorePage.exploreNavButton)
      .first();
    await expect(navOrBack).toBeVisible({ timeout: 5000 });

    // 6. Verify user can still interact and navigate back to explore
    const backBtn = page.getByRole('menuitem', { name: 'Back' }).first();
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
    } else {
      await explorePage.clickExploreButton();
    }
    await explorePage.verifyExploreHeader();
    expect(pageErrors).toHaveLength(0);
  });

  /**
   * Test Case 11: Profile Card Click for User Who Blocked Requester (Race Condition Handling)
   * Validates:
   *  - User searches and sees target user in search results.
   *  - Target user blocks the requester immediately before the click (backend returns 403 Forbidden).
   *  - Application handles blocked state gracefully without unhandled exception or crash.
   *  - UI shell remains intact and user can continue navigating.
   */
  test('TC_EXP_011: clicking profile card from search results for user who blocked requester alerts/handles gracefully without app crash', async ({ page }) => {
    const explorePage = new ExplorePage(page);

    // Track unhandled errors & dialogs
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const dialogMessages: string[] = [];
    page.on('dialog', async dialog => {
      dialogMessages.push(dialog.message());
      await dialog.dismiss().catch(() => {});
    });

    // 1. Search for a user on explore page to populate search results
    await explorePage.searchUsers('archie');
    await expect(explorePage.userCards.first()).toBeVisible({ timeout: 15000 });

    // 2. Intercept profile and user data requests just before click to simulate blocked requester (403 Forbidden)
    await page.route(url => {
      const u = url.toString();
      return u.includes('/api/init/users/') || u.includes('/api/profiles/5bfe8fbe') || u.includes('/api/profiles/4763e1b5');
    }, async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'ACCESS_DENIED',
          code: 'USER_BLOCKED',
          message: 'You cannot view this profile because this user has blocked you.'
        })
      });
    });

    // 3. Click the target profile card from search results
    const card = explorePage.userCards.first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(2000);

    // 4. Assert no unhandled runtime exceptions or React white-screen crash occurred
    expect(pageErrors).toHaveLength(0);

    // 5. Assert UI shell remains rendered, visible, and stable
    await expect(page.locator('body')).toBeVisible();
    const navOrBackBlocked = page.getByRole('menuitem', { name: 'Back' })
      .or(explorePage.homeNavButton)
      .or(explorePage.exploreNavButton)
      .first();
    await expect(navOrBackBlocked).toBeVisible({ timeout: 5000 });

    // 6. Verify user can still interact and navigate back to explore
    const backBtnBlocked = page.getByRole('menuitem', { name: 'Back' }).first();
    if (await backBtnBlocked.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtnBlocked.click();
    } else {
      await explorePage.clickExploreButton();
    }
    await explorePage.verifyExploreHeader();
    expect(pageErrors).toHaveLength(0);
  });

  /**
   * Test Case 12: Nearby Distance Slider Boundary & Clamping Validation
   * Validates:
   *  - Boundary values for Nearby distance slider/input:
   *      1. 0 km is validated and clamped to the valid default radius (100 km).
   *      2. Negative values (e.g. -50 km) are validated and clamped to the valid default radius (100 km).
   *      3. Values exceeding the maximum slider radius (e.g. >5,000 km, 50,000 km) are clamped to the maximum radius capacity (10,000 km).
   *  - No application runtime crashes or unhandled page errors occur.
   */
  test('TC_EXP_012: should validate and clamp boundary values for Nearby distance slider (0 km, negative, and >5000 km)', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 28.6139, longitude: 77.2090 });

    const explorePage = new ExplorePage(page);

    const capturedRadii: string[] = [];
    await page.route('**/api/profiles/explore/nearby*', async route => {
      const url = new URL(route.request().url());
      const radius = url.searchParams.get('radius');
      if (radius) {
        capturedRadii.push(radius);
      }
      await route.continue();
    });

    // 1. Boundary Test 1: Enter 0 km -> clamped to default radius (100 km)
    await explorePage.openNearbyFilterModal();
    await explorePage.setNearbyDistance('0');
    expect(await explorePage.nearbyDistanceInput.inputValue()).toBe('0');
    const radiusCountBefore0 = capturedRadii.length;
    await explorePage.applyNearbyFilter();
    await expect(explorePage.nearbyFilterBtn).toContainText('100km');
    const newRadii0 = capturedRadii.slice(radiusCountBefore0);
    if (newRadii0.length > 0) {
      expect(newRadii0[newRadii0.length - 1]).toBe('100');
    }

    // 2. Boundary Test 2: Enter distance exceeding maximum radius (>5,000 km, e.g. 50,000 km) -> clamped to max slider radius (10,000 km)
    await explorePage.openNearbyFilterModal();
    await explorePage.setNearbyDistance('50000');
    expect(await explorePage.nearbyDistanceInput.inputValue()).toBe('50000');
    const radiusCountBeforeMax = capturedRadii.length;
    await explorePage.applyNearbyFilter();
    await expect(explorePage.nearbyFilterBtn).toContainText('10000km');
    const newRadiiMax = capturedRadii.slice(radiusCountBeforeMax);
    if (newRadiiMax.length > 0) {
      expect(newRadiiMax[newRadiiMax.length - 1]).toBe('10000');
    }

    // 3. Boundary Test 3: Enter negative distance (-50 km) -> clamped to valid default radius (100 km)
    await explorePage.openNearbyFilterModal();
    await explorePage.setNearbyDistance('-50');
    expect(await explorePage.nearbyDistanceInput.inputValue()).toBe('-50');
    const radiusCountBeforeNeg = capturedRadii.length;
    await explorePage.applyNearbyFilter();
    await expect(explorePage.nearbyFilterBtn).toContainText('100km');
    const newRadiiNeg = capturedRadii.slice(radiusCountBeforeNeg);
    if (newRadiiNeg.length > 0) {
      expect(newRadiiNeg[newRadiiNeg.length - 1]).toBe('100');
    }

    // Assert zero runtime crashes
    expect(pageErrors).toHaveLength(0);
  });

});



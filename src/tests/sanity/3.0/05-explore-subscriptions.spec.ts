import { test, expect } from '@playwright/test';
import { HomePage } from '../../../pages/HomePage';
import { LoginPage } from '../../../pages/LoginPage';
import { ExplorePage } from '../../../pages/ExplorePage';
import { FormManagementPage } from '../../../pages/FormManagementPage';
import { SANITY_3_DATA } from './data/sanity3.data';

test.describe('Sanity 3.0: Explore, Profiles & Subscriptions Management Suite', () => {
  test.setTimeout(90000);

  let homePage: HomePage;
  let loginPage: LoginPage;
  let explorePage: ExplorePage;
  let formManagementPage: FormManagementPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    explorePage = new ExplorePage(page);
    formManagementPage = new FormManagementPage(page);

    // Perform standard login with primary test account
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      SANITY_3_DATA.AUTH.PRIMARY_USER.email,
      SANITY_3_DATA.AUTH.PRIMARY_USER.password
    );
    await loginPage.verifyLoggedInState();
  });

  test('SANITY_3_EXP_001: Discover users on Explore page with tag filters and profile card attributes', async ({ page }) => {
    await explorePage.clickExploreButton();
    await explorePage.verifyExploreHeader();

    // Verify filter action buttons
    await explorePage.verifyExploreFilterButtons();

    // Test Nearby Filter modal
    await explorePage.testNearbyFilterModal();

    // Test Tags Filter modal
    await explorePage.testTagsFilterModal();

    // Test Active filter toggle
    await explorePage.testActiveFilterToggle();

    // Verify user card list contains avatar, username, and valid tags
    await explorePage.verifyExploreUsersList();
  });

  test('SANITY_3_EXP_002: Inspect public user profile and toggle form subscription', async ({ page }) => {
    await explorePage.clickExploreButton();
    await explorePage.verifyExploreHeader();

    // Click on a user profile in the explore directory
    await explorePage.clickUserProfile(0);

    // Verify Profile header, metadata badges (JOINED, REP, TAGS), and action buttons
    await explorePage.verifyProfileView();

    // Verify user's forms section is present
    await explorePage.verifyFormsSection();

    // Verify and toggle form subscribe button
    await explorePage.verifyAndClickSubscribeButton();
  });

  test('SANITY_3_EXP_003: Subscriptions management view - search, batch selection, and form toggling', async ({ page }) => {
    // Navigate directly to dedicated Subscriptions management view
    await formManagementPage.navigateToSubscriptions();

    // Search for a known subscribed form
    await formManagementPage.searchSubscriptions('posts');

    // Toggle batch selection mode and assert checkbox elements
    await formManagementPage.toggleBatchSelection();

    // Toggle subscription state on an existing form item
    await formManagementPage.toggleSubscriptionOnForm('test form');

    // Verify subscriptions heading remains visible and active
    await expect(formManagementPage.subscriptionsHeading).toBeVisible();
  });
});

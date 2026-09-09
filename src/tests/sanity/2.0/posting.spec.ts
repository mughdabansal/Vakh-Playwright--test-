import { test, expect } from '@playwright/test';
import { HomePage } from '../../../pages/HomePage';
import { LoginPage } from '../../../pages/LoginPage';
import { PostComposerPage } from '../../../pages/PostComposerPage';
import { TEST_USERS } from '../../../config/constants';

test.describe('Eve Vakh - Sanity 2.0: Home Posting & Composer Test Suite', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    // 1. Navigate to Sign-In
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();

    // 2. Authenticate
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();
  });

  /**
   * Test Case 1: Home Page "New Post" Button Presence & Interactivity
   * Validates:
   *  - Authenticated home page renders the "New Post" action button.
   *  - Clicking "New Post" button launches the "CREATE FORMS" modal dialog.
   */
  test('TC_POST_001: should display New Post button on home page and launch creation modal', async ({ page }) => {
    const composerPage = new PostComposerPage(page);

    await composerPage.openNewPostModal();
    await expect(composerPage.createFormsDialog).toBeVisible();
    await expect(page.getByText(/^create$/i).first()).toBeVisible();
  });

  /**
   * Test Case 2: Target Form Selection in Post Creation Flow
   * Validates:
   *  - "CREATE FORMS" dialog lists available user forms (e.g. @m_2094 / posts).
   *  - Clicking the form opens the dedicated post composer modal with appropriate header.
   */
  test('TC_POST_002: should select target form and transition into post composer view', async ({ page }) => {
    const composerPage = new PostComposerPage(page);

    await composerPage.openNewPostModal();
    await composerPage.selectTargetForm();

    await expect(composerPage.composerHeader).toBeVisible();
    await expect(composerPage.composerHeader).toContainText(/NEW POST IN/i);
  });

  /**
   * Test Case 3: Post Composer Composition Tools Verification
   * Validates:
   *  - All composition tool buttons are displayed: "Add Text", "Add Media", "Add Longform", "Add Link", "Add Quote", "Add Mention".
   *  - "Create" action button and "Close" controls are available and accessible.
   */
  test('TC_POST_003: should render all composition tools and submit controls in composer', async ({ page }) => {
    const composerPage = new PostComposerPage(page);

    await composerPage.openNewPostModal();
    await composerPage.selectTargetForm();
    await composerPage.verifyCompositionTools();
  });

  /**
   * Test Case 4: Text Content Input and Post Submission Interaction
   * Validates:
   *  - Clicking "Add Text" displays the content editor.
   *  - Text can be entered and "Create" button executes post submission.
   */
  test('TC_POST_004: should allow entering text content and submitting new post', async ({ page }) => {
    const composerPage = new PostComposerPage(page);

    await composerPage.openNewPostModal();
    await composerPage.selectTargetForm();
    
    // Add text content
    const testPostText = `Automated Sanity Post [${Date.now()}]`;
    await composerPage.enterTextContent(testPostText);

    // Verify Create button is active and click
    await composerPage.submitPost();

    // Verify dialog closes or returns to authenticated view
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/auth/sign-in');
  });

});

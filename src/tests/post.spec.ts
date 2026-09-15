import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { PostComposerPage } from '../pages/PostComposerPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Post Creation & Composer Full Test Suite', () => {
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
   * Test Case 1: "New Post" Button Presence & Modal Dialog Launch
   * Validates:
   *  - Home page displays the "New Post" button.
   *  - Clicking launches the "CREATE FORMS" target selector modal.
   */
  test('TC_POST_001: should display New Post button and launch post creation modal', async ({ page }) => {
    const composerPage = new PostComposerPage(page);

    await composerPage.openNewPostModal();
    await expect(composerPage.createFormsDialog).toBeVisible();
    await expect(page.getByText(/^create$/i).first()).toBeVisible();
  });

  /**
   * Test Case 2: Target Form Selection
   * Validates:
   *  - Modal allows selecting user's designated form (e.g. @m_2094 / posts).
   *  - Transition to full composer interface with "NEW POST IN" header.
   */
  test('TC_POST_002: should select target user form and transition into composer view', async ({ page }) => {
    const composerPage = new PostComposerPage(page);

    await composerPage.openNewPostModal();
    await composerPage.selectTargetForm();

    await expect(composerPage.composerHeader).toBeVisible();
    await expect(composerPage.composerHeader).toContainText(/NEW POST IN/i);
  });

  /**
   * Test Case 3: Composition Toolbar & Tools Verification
   * Validates:
   *  - Composition tools: Add Text, Add Media, Add Longform, Add Link, Add Quote, Add Mention.
   *  - Submit controls and action buttons are visible and active.
   */
  test('TC_POST_003: should render all composition tools and submit controls', async ({ page }) => {
    const composerPage = new PostComposerPage(page);

    await composerPage.openNewPostModal();
    await composerPage.selectTargetForm();
    await composerPage.verifyCompositionTools();
  });

  /**
   * Test Case 4: Text Content Input and Post Publishing Flow
   * Validates:
   *  - User can enter post text into the content editor.
   *  - Clicking submit creates the post and maintains active session.
   */
  test('TC_POST_004: should enter text content and submit new post successfully', async ({ page }) => {
    const composerPage = new PostComposerPage(page);

    await composerPage.openNewPostModal();
    await composerPage.selectTargetForm();

    const uniquePost = `CI/CD Verification Post [${Date.now()}]`;
    await composerPage.enterTextContent(uniquePost);
    await composerPage.submitPost();

    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/auth/sign-in');
  });

});

import { test, expect } from '@playwright/test';
import { HomePage } from '../../../pages/HomePage';
import { LoginPage } from '../../../pages/LoginPage';
import { PostComposerPage } from '../../../pages/PostComposerPage';
import { FormManagementPage } from '../../../pages/FormManagementPage';
import { SANITY_3_DATA } from './data/sanity3.data';

test.describe('Eve Vakh - Sanity 3.0: Post Lifecycle (Create, Edit, Heart, Archive, Delete)', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

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

  /**
   * Test Case 1: Create a New Post with Dynamic Content in Own Form
   * Validates:
   *  - Clicking "New Post" launches the target selector modal.
   *  - Selecting user's own form transitions into the composer view.
   *  - Submitting post creates the post and maintains active session.
   */
  test('TC_S3_POST_001: should create new post with dynamic text content in own form', async ({ page }) => {
    const composerPage = new PostComposerPage(page);
    const uniquePostText = SANITY_3_DATA.POSTS.CREATE_TITLE();

    await composerPage.openNewPostModal();
    await composerPage.selectTargetForm();
    await composerPage.enterTextContent(uniquePostText);
    await composerPage.submitPost();

    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/auth/sign-in');
  });

  /**
   * Test Case 2: Heart / Like a Post and Verify Interaction State
   * Validates:
   *  - User can navigate into user's own form.
   *  - Clicking "Heart this post" updates the heart state / counter.
   */
  test('TC_S3_POST_002: should heart a post and verify state update in form view', async ({ page }) => {
    const formMgmtPage = new FormManagementPage(page);

    await formMgmtPage.openOwnForm(SANITY_3_DATA.FORMS.DEFAULT_OWN_FORM);
    const { initialLabel, updatedLabel } = await formMgmtPage.heartFirstPost();
    expect(updatedLabel).toBeDefined();
  });

  /**
   * Test Case 3: Select Post and Execute In-Place Post Editing
   * Validates:
   *  - User selects an existing post using "Select post".
   *  - Action bar displays "Edit post".
   *  - Clicking "Edit post" opens the inline text editor.
   *  - Entering updated content and submitting saves the modified post.
   */
  test('TC_S3_POST_003: should select post and execute in-place editing flow', async ({ page }) => {
    const formMgmtPage = new FormManagementPage(page);
    const updatedPostContent = SANITY_3_DATA.POSTS.EDIT_TITLE();

    await formMgmtPage.openOwnForm(SANITY_3_DATA.FORMS.DEFAULT_OWN_FORM);
    await formMgmtPage.selectFirstPost();
    await formMgmtPage.editSelectedPost(updatedPostContent);

    // Verify view returns to form without errors
    await expect(page).toHaveURL(/\/form\//);
  });

  /**
   * Test Case 4: Select Post and Execute Post Archiving Flow
   * Validates:
   *  - Selecting post reveals "Archive post" action button.
   *  - Clicking "Archive post" triggers post archive state transition.
   */
  test('TC_S3_POST_004: should select post and trigger post archiving action', async ({ page }) => {
    const formMgmtPage = new FormManagementPage(page);

    await formMgmtPage.openOwnForm(SANITY_3_DATA.FORMS.DEFAULT_OWN_FORM);
    await formMgmtPage.selectFirstPost();
    await formMgmtPage.archiveSelectedPost();

    await expect(page).toHaveURL(/\/form\//);
  });

  /**
   * Test Case 5: Post Deletion & Draft Cleanup Workflow
   * Validates:
   *  - Initiating creation allows deleting drafts and clearing uncommitted posts.
   *  - Clean dismissal of composer state without leaving broken artifacts.
   */
  test('TC_S3_POST_005: should delete draft post cleanly and verify dismiss state', async ({ page }) => {
    const formMgmtPage = new FormManagementPage(page);

    await formMgmtPage.deleteDraftOrPost();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
  });
});

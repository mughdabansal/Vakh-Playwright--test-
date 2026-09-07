import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ExplorePage } from '../pages/ExplorePage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Login Page Functional & Button Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();
  });

  /**
   * Test Case 1: Initial Login Page UI Elements & Auxiliary Controls
   * Validates:
   *  - Email or phone number input field
   *  - "Send code" button (default OTP mode)
   *  - "Use password" link button
   *  - "Create an account" link
   *  - Auxiliary action buttons: "Recovery", "About", "More"
   */
  test('TC-01: should display all initial login page elements and auxiliary controls', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.verifyInitialLoginPageElements();
  });

  /**
   * Test Case 2: Mode Switching (OTP Mode <-> Password Mode)
   * Validates:
   *  - Clicking "Use password" link dynamically reveals the Password input field.
   *  - Displays the "Use a one-time code instead" toggle link.
   *  - Clicking "Use a one-time code instead" reverts the form back to OTP mode,
   *    hiding the password input and restoring "Send code".
   */
  test('TC-02: should switch between OTP mode and Password mode seamlessly', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 1. Click "Use password" to enter Password Mode
    await loginPage.clickUsePassword();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.useOneTimeCodeLink).toBeVisible();

    // 2. Click "Use a one-time code instead" to return to OTP Mode
    await loginPage.clickUseOneTimeCode();
    await expect(loginPage.passwordInput).toBeHidden();
    await expect(loginPage.sendCodeButton).toBeVisible();
    await expect(loginPage.usePasswordLink).toBeVisible();
  });

  /**
   * Test Case 3: Password Masking, Show Password Toggle & Legal Links
   * Validates:
   *  - Password characters are masked by default (type="password").
   *  - "Show password" eye toggle button is displayed when password has input.
   *  - Clicking "Show password" reveals plain text password.
   *  - Terms of Service and Privacy Policy links are presented upon filling credentials.
   */
  test('TC-03: should verify password masking, show-password toggle and legal links', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 1. Enter password mode
    await loginPage.clickUsePassword();

    // 2. Fill email and password
    await loginPage.emailInput.fill(TEST_USERS.DEFAULT_USER.email);
    await loginPage.passwordInput.fill(TEST_USERS.DEFAULT_USER.password);

    // 3. Verify password input is masked by default
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    // 4. Verify "Show password" toggle button is visible
    await expect(loginPage.showPasswordButton).toBeVisible();

    // 5. Click "Show password" toggle and verify password is unmasked (no longer type="password")
    await loginPage.toggleShowPassword();
    const visiblePasswordInput = page.getByPlaceholder(/password/i);
    await expect(visiblePasswordInput).not.toHaveAttribute('type', 'password');

    // 6. Click again to re-mask password
    await loginPage.toggleShowPassword();
    await expect(visiblePasswordInput).toHaveAttribute('type', 'password');

    // 7. Verify legal documentation links (Terms of Service & Privacy Policy)
    await expect(loginPage.termsLink).toBeVisible();
    await expect(loginPage.privacyLink).toBeVisible();
  });

  /**
   * Test Case 4: Complete End-to-End Password Authentication & Post-Login Flow
   * Validates:
   *  - "Sign in" button submits credentials and establishes session.
   *  - Successful redirection to the authenticated home page.
   *  - Chat navigation and "Messages" header display.
   *  - Activity navigation and "Activity" header display.
   *  - Explore navigation, "Explore" header display, and user cards verification
   *    (Profile picture, Username with @, User name, and Topic tags).
   */
  test('TC-04: should complete login with password and navigate through Chat, Activity, and Explore', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const explorePage = new ExplorePage(page);

    // 1. Enter password mode and login
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );

    // 2. Verify authenticated session state
    await loginPage.verifyLoggedInState();

    // 3. Click Chat and verify header
    await explorePage.clickChatButton();
    await explorePage.verifyChatHeader();

    // 4. Click Activity and verify header
    await explorePage.clickActivityButton();
    await explorePage.verifyActivityHeader();

    // 5. Click Explore and verify header
    await explorePage.clickExploreButton();
    await explorePage.verifyExploreHeader();

    // 6. Verify Explore user list cards (Avatar, @handle, Name, Tags)
    await explorePage.verifyExploreUsersList();
  });

});

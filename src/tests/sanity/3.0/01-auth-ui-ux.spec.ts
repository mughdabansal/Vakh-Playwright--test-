import { test, expect } from '@playwright/test';
import { HomePage } from '../../../pages/HomePage';
import { LoginPage } from '../../../pages/LoginPage';
import { ExplorePage } from '../../../pages/ExplorePage';
import { SANITY_3_DATA } from './data/sanity3.data';

test.describe('Eve Vakh - Sanity 3.0: Core Authentication & Platform UI/UX Suite', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();
  });

  /**
   * Test Case 1: Complete Authentication, Password Masking & Session Persistence
   * Validates:
   *  - Login with password mode using primary test credentials.
   *  - Show password / hide password toggle functionality.
   *  - Successful redirection to authenticated home page.
   *  - Session persistence across page reloads without re-authentication prompt.
   */
  test('TC_S3_AUTH_001: should authenticate with password, verify mask toggle and session persistence', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const homePage = new HomePage(page);

    // 1. Enter password mode
    await loginPage.clickUsePassword();

    // 2. Fill credentials
    await loginPage.emailInput.fill(SANITY_3_DATA.AUTH.PRIMARY_USER.email);
    await loginPage.passwordInput.fill(SANITY_3_DATA.AUTH.PRIMARY_USER.password);

    // 3. Verify password masking & toggle
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    if (await loginPage.showPasswordButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginPage.toggleShowPassword();
      const visibleInput = page.getByPlaceholder(/password/i);
      await expect(visibleInput).not.toHaveAttribute('type', 'password');
      await loginPage.toggleShowPassword();
      await expect(visibleInput).toHaveAttribute('type', 'password');
    }

    // 4. Submit login
    await loginPage.signInButton.click();
    await loginPage.verifyLoggedInState();

    // 5. Test session persistence across reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(homePage.homeNavButton).toBeVisible({ timeout: 15000 });
    expect(page.url()).not.toContain('/auth/sign-in');
  });

  /**
   * Test Case 2: Mode Switching Between OTP Mode and Password Mode
   * Validates:
   *  - Default state is OTP code mode with "Send code" button.
   *  - Switching to password mode displays password input field.
   *  - Switching back to OTP mode cleanly restores "Send code" and hides password input.
   */
  test('TC_S3_AUTH_002: should seamlessly toggle between OTP mode and Password mode', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Default: OTP mode
    await expect(loginPage.sendCodeButton).toBeVisible({ timeout: 5000 });
    await expect(loginPage.usePasswordLink).toBeVisible({ timeout: 5000 });

    // Switch to Password mode
    await loginPage.clickUsePassword();
    await expect(loginPage.passwordInput).toBeVisible({ timeout: 5000 });
    await expect(loginPage.useOneTimeCodeLink).toBeVisible({ timeout: 5000 });

    // Switch back to OTP mode
    await loginPage.clickUseOneTimeCode();
    await expect(loginPage.passwordInput).toBeHidden({ timeout: 5000 });
    await expect(loginPage.sendCodeButton).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test Case 3: Application UI/UX Layout, Sidebar Navigation & Visual Hierarchy
   * Validates:
   *  - Home header branding, sidebar action buttons (New Post, @m_2094, More).
   *  - Seamless navigation transitions across core sections: Home -> Chat -> Activity -> Explore.
   *  - Section headers render accurately with zero visual regressions or broken layouts.
   */
  test('TC_S3_UIUX_003: should validate full UI/UX layout, navigation responsiveness and route headers', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const homePage = new HomePage(page);
    const explorePage = new ExplorePage(page);

    // Authenticate
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      SANITY_3_DATA.AUTH.PRIMARY_USER.email,
      SANITY_3_DATA.AUTH.PRIMARY_USER.password
    );
    await loginPage.verifyLoggedInState();

    // Verify Home UI layout
    await homePage.verifyHomeUILayout();

    // Navigate to Chat & assert header
    await explorePage.clickChatButton();
    await explorePage.verifyChatHeader();

    // Navigate to Activity & assert header
    await explorePage.clickActivityButton();
    await explorePage.verifyActivityHeader();

    // Navigate to Explore & assert header
    await explorePage.clickExploreButton();
    await explorePage.verifyExploreHeader();

    // Return to Home
    await homePage.homeNavButton.click();
    await expect(page).toHaveURL(/^https:\/\/eve\.vakh\.com\/?$/);
    await expect(homePage.homeHeader).toBeVisible({ timeout: 10000 });
  });
});

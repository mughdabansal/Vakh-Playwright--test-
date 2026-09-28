import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { SettingsPage } from '../pages/SettingsPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Settings & Profile Configuration Suite', () => {

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

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
  });

  /**
   * Test Case: Username Format Restrictions Validation
   * Validates:
   *  - Attempting to save a username containing spaces (e.g., 'invalid user name') displays format requirements.
   *  - Attempting to save a username containing disallowed symbols (e.g., 'bad@user!') displays format requirements.
   *  - Validation message 'Username can only contain lowercase letters, numbers, and underscores' is displayed.
   *  - Save button is strictly disabled, preventing persistence of invalid format.
   *  - Form is safely cancelled without modifying account data.
   *  - Zero uncaught runtime errors or application crashes.
   */
  test('TC_SET_001: attempting to save username containing spaces or disallowed symbols displays format requirements and blocks save', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const settingsPage = new SettingsPage(page);

    // 1. Navigate to profile settings
    await settingsPage.gotoProfileSettings();

    // 2. Click 'Edit profile' to activate username input
    await settingsPage.clickEditProfile();

    // 3. Test spaces in username: 'invalid username'
    await settingsPage.fillUsername('invalid username');
    await settingsPage.verifyUsernameFormatErrorDisplayed();

    // 4. Test disallowed symbols in username: 'bad@user!'
    await settingsPage.fillUsername('bad@user!');
    await settingsPage.verifyUsernameFormatErrorDisplayed();

    // 5. Test uppercase letters (since requirement requires lowercase): 'INVALID_USER'
    await settingsPage.fillUsername('INVALID_USER');
    await settingsPage.verifyUsernameFormatErrorDisplayed();

    // 6. Safely cancel edit mode without persisting any changes
    await settingsPage.clickCancel();

    // 7. Verify zero uncaught frontend exceptions
    expect(pageErrors).toHaveLength(0);
  });

  /**
   * Test Case: Oversized Profile Photo Boundary Validation (>15MB)
   * Validates:
   *  - Attempting to upload an oversized profile photo (>15MB) shows an error message.
   *  - An option to crop/compress or appropriate rejection is displayed.
   *  - Form is not corrupted and zero uncaught application exceptions occur.
   */
  test('TC_SET_002: uploading oversized profile photo (>15MB) shows error with option to crop/compress', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const settingsPage = new SettingsPage(page);

    // 1. Navigate to profile settings & activate edit mode
    await settingsPage.gotoProfileSettings();
    await settingsPage.clickEditProfile();

    // 2. Prepare 16 MB oversized JPEG image buffer
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const largeBuffer = Buffer.concat([jpegHeader, Buffer.alloc(16 * 1024 * 1024)]);

    // 3. Upload oversized photo via file chooser
    await settingsPage.uploadPhoto('oversized_profile_picture.jpg', 'image/jpeg', largeBuffer);

    // 4. Verify validation error is displayed and persistence is prevented
    await settingsPage.verifyOversizedPhotoError();

    // 5. Safely cancel edit mode
    await settingsPage.clickCancel();

    // 6. Verify zero uncaught frontend exceptions
    expect(pageErrors).toHaveLength(0);
  });
});


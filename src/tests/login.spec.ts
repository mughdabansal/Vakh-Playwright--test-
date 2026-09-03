import { test } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - User Authentication & Login Flow', () => {

  test('should request verification code for email and complete login when OTP code is provided', async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    // 1. Navigate to home page and click 'web'
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();

    // 2. Request verification code for default user
    await loginPage.requestVerificationCode(TEST_USERS.DEFAULT_USER.email);

    // 3. Submit code if provided in environment
    const otpCode = process.env.OTP_CODE;
    if (otpCode) {
      await loginPage.submitVerificationCode(otpCode);
      const mfaCode = process.env.MFA_CODE;
      if (mfaCode) {
        await loginPage.submitMfaCode(mfaCode);
      }
      await loginPage.verifyLoggedInState();
    }
  });

});

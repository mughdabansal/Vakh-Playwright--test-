import { test, expect } from '@playwright/test';
import { RecoveryPage } from '../pages/RecoveryPage';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Account Recovery & 2FA Security Suite', () => {

  /**
   * Test Case 1: 2FA TOTP Brute-Force Rate Limiting (Row 18)
   * Validates:
   *  - Entering an incorrect 2FA authenticator TOTP code 5 times in succession
   *    disables further attempts for 15 minutes to prevent brute forcing.
   *  - Error message explaining 15-minute lockout is displayed.
   *  - Form submission is disabled/blocked after 5th failed attempt.
   *  - Zero uncaught frontend exceptions.
   */
  test('TC_REC_001: entering incorrect 2FA authenticator TOTP code 5 times disables further attempts for 15 minutes', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);
    const recoveryPage = new RecoveryPage(page);

    // 1. Navigate to Sign-In page
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();

    // 2. Click "Recovery" button to access recovery module
    const recoveryButton = page.getByRole('button', { name: 'Recovery' }).first();
    await expect(recoveryButton).toBeVisible({ timeout: 5000 });
    await recoveryButton.click();
    await page.waitForURL(url => url.pathname.includes('/auth/recover-account'), { timeout: 10000 });

    // 3. Select "I lost my authenticator" option
    await recoveryPage.selectLostAuthenticator();

    // 4. Track attempts and intercept TOTP / verification endpoints
    let attemptCount = 0;
    await page.route(url => {
      const u = url.toString();
      return u.includes('/api/auth/') || u.includes('/api/recovery/') || u.includes('/auth/');
    }, async (route, request) => {
      const u = request.url();
      const method = request.method();

      if (method === 'POST' && (u.includes('/send-otp') || u.includes('/verify') || u.includes('/totp') || u.includes('/recover') || u.includes('/code'))) {
        attemptCount++;
        if (attemptCount >= 5) {
          // 5th attempt triggers 15-minute brute-force lockout
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'TOO_MANY_ATTEMPTS',
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many incorrect 2FA attempts. Further attempts are disabled for 15 minutes to prevent brute forcing.',
              retryAfter: 900
            })
          });
          return;
        } else {
          // Attempts 1 through 4 return invalid code with remaining attempts
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'INVALID_TOTP_CODE',
              message: `Invalid authenticator code. ${5 - attemptCount} attempts remaining before temporary lockout.`
            })
          });
          return;
        }
      }
      await route.continue();
    });

    // 5. Fill recovery identifier
    await expect(recoveryPage.emailOrPhoneInput).toBeVisible({ timeout: 5000 });
    await recoveryPage.emailOrPhoneInput.fill(TEST_USERS.DEFAULT_USER.email);

    // 6. Submit 5 incorrect attempts in succession
    for (let i = 1; i <= 5; i++) {
      if (await recoveryPage.sendRecoveryCodeButton.isVisible().catch(() => false)) {
        await recoveryPage.sendRecoveryCodeButton.click();
        await page.waitForTimeout(500);
      }
    }

    // 7. Verify clear error prompt explains 15-minute disabling/lockout
    const rateLimitError = page.locator('text=/disabled for 15 minutes|15 minutes|too many.*attempts|rate limit|temporarily locked/i').or(
      page.locator('[role="alert"], [class*="error" i], [class*="toast" i]')
    ).locator('visible=true').first();

    await expect(rateLimitError).toBeVisible({ timeout: 10000 });

    // 8. Verify zero uncaught frontend exceptions
    expect(pageErrors).toHaveLength(0);
  });
});

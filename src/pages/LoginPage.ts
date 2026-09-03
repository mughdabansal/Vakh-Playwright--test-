import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model representing the Eve Vakh Login / Sign-In Page.
 */
export class LoginPage extends BasePage {
  readonly rootContainer: Locator;
  readonly emailInput: Locator;
  readonly sendCodeButton: Locator;
  readonly codeInput: Locator;
  readonly mfaInput: Locator;
  readonly continueButton: Locator;
  readonly homeHeader: Locator;

  constructor(page: Page) {
    super(page);
    this.rootContainer = page.locator('#root');

    // Email / Phone input field
    this.emailInput = page.getByPlaceholder(/email or phone number/i).or(page.locator('input[type="email"]'));

    // Send code button
    this.sendCodeButton = page.getByRole('button', { name: /send code/i }).first();

    // Verification code input field
    this.codeInput = page.getByLabel(/verification code/i).or(page.getByPlaceholder(/code/i)).or(page.locator('input[autocomplete="one-time-code"]'));

    // 2FA / MFA authenticator app code input field
    this.mfaInput = page.getByLabel(/authenticator app/i).or(page.getByPlaceholder(/enter the code/i)).or(page.locator('input[type="text"]'));

    // Continue / Login submit button
    this.continueButton = page.getByRole('button', { name: /continue|login/i }).first();

    // Home / Dashboard Header after successful login
    this.homeHeader = page.locator('header').or(page.getByRole('heading', { level: 1 })).or(page.getByText('vakh', { exact: true }));
  }

  /**
   * Verifies that the user is currently on the Login page.
   */
  async verifyIsOnLoginPage() {
    await this.waitForUrlPattern(/\/auth\/sign-in/);
    await expect(this.rootContainer).toBeVisible({ timeout: 10000 });
  }

  /**
   * Enters email address and clicks 'Send code'.
   */
  async requestVerificationCode(email: string) {
    await expect(this.emailInput).toBeVisible({ timeout: 10000 });
    await this.emailInput.fill(email);
    await expect(this.sendCodeButton).toBeEnabled({ timeout: 5000 });
    await this.sendCodeButton.click();
  }

  /**
   * Enters the one-time verification code and submits.
   */
  async submitVerificationCode(code: string) {
    await expect(this.codeInput).toBeVisible({ timeout: 10000 });
    await this.codeInput.fill(code);
    await expect(this.continueButton).toBeEnabled({ timeout: 5000 });
    await this.continueButton.click();
  }

  /**
   * Enters the 2FA authenticator app code and submits.
   */
  async submitMfaCode(mfaCode: string) {
    await expect(this.mfaInput).toBeVisible({ timeout: 10000 });
    await this.mfaInput.fill(mfaCode);
    await expect(this.continueButton).toBeEnabled({ timeout: 5000 });
    await this.continueButton.click();
  }

  /**
   * Verifies that the user has successfully logged in and the home header is displayed.
   */
  async verifyLoggedInState() {
    await expect(this.homeHeader).toBeVisible({ timeout: 15000 });
  }
}

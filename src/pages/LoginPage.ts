import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model representing the Eve Vakh Login / Sign-In Page.
 */
export class LoginPage extends BasePage {
  readonly rootContainer: Locator;
  readonly emailInput: Locator;
  readonly usePasswordLink: Locator;
  readonly passwordInput: Locator;
  readonly showPasswordButton: Locator;
  readonly signInButton: Locator;
  readonly sendCodeButton: Locator;
  readonly useOneTimeCodeLink: Locator;
  readonly codeInput: Locator;
  readonly mfaInput: Locator;
  readonly continueButton: Locator;
  readonly homeHeader: Locator;
  readonly recoveryButton: Locator;
  readonly aboutButton: Locator;
  readonly moreButton: Locator;
  readonly createAccountLink: Locator;
  readonly termsLink: Locator;
  readonly privacyLink: Locator;

  constructor(page: Page) {
    super(page);
    this.rootContainer = page.locator('#root');

    // Email / Phone input field
    this.emailInput = page.getByPlaceholder(/email or phone number/i).or(page.locator('input[autocomplete="username"]')).or(page.locator('input[type="email"], input[type="text"]').first());

    // 'Use password' link button under the login / send code button
    this.usePasswordLink = page.getByRole('link', { name: /use\s*password/i }).or(page.getByText(/use\s*password/i));

    // Password input field
    this.passwordInput = page.getByPlaceholder(/password/i).or(page.locator('input[type="password"]'));

    // 'Show password' / 'Hide password' eye icon toggle button
    this.showPasswordButton = page.getByRole('button', { name: /show password/i });

    // Sign in button (visible when in password mode)
    this.signInButton = page.getByRole('button', { name: /sign in/i });

    // Send code button
    this.sendCodeButton = page.getByRole('button', { name: /send code/i }).first();

    // 'Use a one-time code instead' link button
    this.useOneTimeCodeLink = page.getByRole('link', { name: /use a one-time code instead/i });

    // Auxiliary buttons on the login page
    this.recoveryButton = page.getByRole('button', { name: /recovery/i });
    this.aboutButton = page.getByRole('button', { name: /about/i });
    this.moreButton = page.getByRole('button', { name: /show more actions/i });
    this.createAccountLink = page.getByRole('link', { name: 'Create an account' });

    // Legal links
    this.termsLink = page.getByRole('link', { name: /terms/i }).first();
    this.privacyLink = page.getByRole('link', { name: /privacy/i }).first();

    // Verification code input field
    this.codeInput = page.getByLabel(/verification code/i).or(page.getByPlaceholder(/code/i)).or(page.locator('input[autocomplete="one-time-code"]'));

    // 2FA / MFA authenticator app code input field
    this.mfaInput = page.getByLabel(/authenticator app/i).or(page.getByPlaceholder(/enter the code/i)).or(page.locator('input[type="text"]'));

    // Continue / Login submit button
    this.continueButton = page.getByRole('button', { name: /continue|login/i }).first();

    // Home / Dashboard navigation item after successful login
    this.homeHeader = page.getByRole('menuitem', { name: 'Home' }).or(page.getByRole('button', { name: /new post/i })).or(page.getByRole('button', { name: /m_2094/i })).first();
  }

  /**
   * Verifies that the user is currently on the Login page.
   */
  async verifyIsOnLoginPage() {
    await this.waitForUrlPattern(/\/auth\/sign-in/);
    await expect(this.rootContainer).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verifies that the initial login page elements and auxiliary controls are displayed.
   */
  async verifyInitialLoginPageElements() {
    await expect(this.emailInput).toBeVisible({ timeout: 10000 });
    await expect(this.sendCodeButton).toBeVisible({ timeout: 5000 });
    await expect(this.usePasswordLink).toBeVisible({ timeout: 5000 });
    await expect(this.createAccountLink).toBeVisible({ timeout: 5000 });
    await expect(this.recoveryButton).toBeVisible({ timeout: 5000 });
    await expect(this.aboutButton).toBeVisible({ timeout: 5000 });
    await expect(this.moreButton).toBeVisible({ timeout: 5000 });
  }

  /**
   * Clicks on the 'Use password' link button before adding email / credentials.
   */
  async clickUsePassword() {
    await expect(this.usePasswordLink).toBeVisible({ timeout: 10000 });
    await this.usePasswordLink.click();
    await expect(this.passwordInput).toBeVisible({ timeout: 5000 });
  }

  /**
   * Clicks on 'Use a one-time code instead' to toggle back from password mode to OTP mode.
   */
  async clickUseOneTimeCode() {
    await expect(this.useOneTimeCodeLink).toBeVisible({ timeout: 10000 });
    await this.useOneTimeCodeLink.click();
    await expect(this.sendCodeButton).toBeVisible({ timeout: 5000 });
  }

  /**
   * Toggles the password visibility eye button (Show password / Hide password).
   */
  async toggleShowPassword() {
    const toggleBtn = this.page.getByRole('button', { name: /show password|hide password/i });
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });
    await toggleBtn.click();
  }

  /**
   * Enters email address and password, then clicks 'Sign in'.
   */
  async loginWithPassword(email: string, password: string) {
    await expect(this.emailInput).toBeVisible({ timeout: 10000 });
    await this.emailInput.fill(email);
    await expect(this.passwordInput).toBeVisible({ timeout: 5000 });
    await this.passwordInput.fill(password);
    await expect(this.signInButton).toBeVisible({ timeout: 5000 });
    await expect(this.signInButton).toBeEnabled({ timeout: 5000 });
    await this.page.waitForTimeout(500);
    await this.signInButton.click();
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
   * Verifies that the user has successfully logged in and the home header/dashboard is displayed.
   */
  async verifyLoggedInState() {
    await this.waitForUrlPattern(/^https:\/\/eve\.vakh\.com\/?$/, 20000);
    await expect(this.homeHeader).toBeVisible({ timeout: 15000 });
  }
}

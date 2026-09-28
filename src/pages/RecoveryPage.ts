import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Eve Vakh Account Recovery / 2FA Flow.
 */
export class RecoveryPage extends BasePage {
  readonly recoveryHeader: Locator;
  readonly emailOrPhoneInput: Locator;
  readonly sendRecoveryCodeButton: Locator;
  readonly forgotPasswordButton: Locator;
  readonly lostAuthenticatorButton: Locator;
  readonly cancelRecoveryButton: Locator;
  readonly codeInput: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    super(page);

    this.recoveryHeader = page.getByRole('heading', { name: /recovery|recover/i }).or(page.getByText('Recovery', { exact: true })).locator('visible=true').first();
    this.lostAuthenticatorButton = page.getByRole('button', { name: /i lost my authenticator/i }).locator('visible=true').first();
    this.forgotPasswordButton = page.getByRole('button', { name: /i forgot my password/i }).locator('visible=true').first();
    this.emailOrPhoneInput = page.getByPlaceholder(/email or phone/i).or(page.locator('input[aria-label*="Email or phone" i]')).locator('visible=true').first();
    this.sendRecoveryCodeButton = page.getByRole('button', { name: /send recovery code|send code/i }).locator('visible=true').first();
    this.cancelRecoveryButton = page.getByRole('button', { name: /cancel recovery/i }).locator('visible=true').first();
    this.codeInput = page.getByPlaceholder(/code|authenticator|totp/i).or(page.locator('input[type="text"], input[type="number"]')).locator('visible=true').last();
    this.verifyButton = page.getByRole('button', { name: /verify|continue|submit/i }).locator('visible=true').first();
  }

  async goto() {
    await this.page.goto('https://eve.vakh.com/auth/recover-account');
    await this.page.waitForTimeout(1000);
  }

  async selectLostAuthenticator() {
    await expect(this.lostAuthenticatorButton).toBeVisible({ timeout: 5000 });
    await this.lostAuthenticatorButton.click();
    await this.page.waitForTimeout(1000);
  }
}

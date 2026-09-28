import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { APP_CONFIG } from '../config/constants';

/**
 * Page Object Model representing the Eve Vakh Settings & Profile Settings views.
 */
export class SettingsPage extends BasePage {
  readonly profileSettingsUrl: string = `${APP_CONFIG.BASE_URL}/settings/profile`;
  readonly editProfileButton: Locator;
  readonly usernameInput: Locator;
  readonly saveProfileButton: Locator;
  readonly cancelButton: Locator;
  readonly usernameFormatError: Locator;

  constructor(page: Page) {
    super(page);
    this.editProfileButton = page.getByRole('button', { name: /edit profile/i }).or(page.locator('button:has-text("Edit profile")')).first();
    this.usernameInput = page.locator('input[aria-label="Username"]').or(page.getByLabel(/username/i)).first();
    this.saveProfileButton = page.locator('button[aria-label="Save profile changes"], button:has-text("Save profile changes"), button:has-text("Save")').first();
    this.cancelButton = page.getByRole('button', { name: /^cancel$/i }).or(page.locator('button:has-text("Cancel")')).first();
    this.usernameFormatError = page.getByText(/Username can only contain lowercase letters, numbers, and underscores/i).first();
  }

  /**
   * Navigates directly to /settings/profile.
   */
  async gotoProfileSettings() {
    await this.page.goto(this.profileSettingsUrl, { waitUntil: 'domcontentloaded' });
    await expect(this.editProfileButton).toBeVisible({ timeout: 15000 });
  }

  /**
   * Clicks 'Edit profile' to make profile fields editable.
   */
  async clickEditProfile() {
    await expect(this.editProfileButton).toBeVisible({ timeout: 10000 });
    await this.editProfileButton.click();
    await expect(this.usernameInput).toBeVisible({ timeout: 5000 });
    await expect(this.usernameInput).toBeEnabled({ timeout: 5000 });
  }

  /**
   * Types a test username into the username input.
   */
  async fillUsername(username: string) {
    await expect(this.usernameInput).toBeVisible({ timeout: 5000 });
    await this.usernameInput.fill(username);
    await this.usernameInput.blur();
  }

  /**
   * Asserts the username format validation error is shown and Save button is disabled.
   */
  async verifyUsernameFormatErrorDisplayed() {
    await expect(this.usernameFormatError).toBeVisible({ timeout: 5000 });
    await expect(this.saveProfileButton).toBeDisabled({ timeout: 5000 });
  }

  /**
   * Clicks Cancel to restore original state safely without saving modifications.
   */
  async clickCancel() {
    if (await this.cancelButton.isVisible()) {
      await this.cancelButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Uploads an avatar image using the 'Add photo' file chooser.
   */
  async uploadPhoto(filename: string, mimeType: string, buffer: Buffer) {
    const addPhotoBtn = this.page.getByRole('button', { name: /add photo/i }).or(this.page.locator('button:has-text("Add photo")')).first();
    await expect(addPhotoBtn).toBeVisible({ timeout: 10000 });
    const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 10000 });
    await addPhotoBtn.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: filename,
      mimeType: mimeType,
      buffer: buffer,
    });
  }

  /**
   * Asserts that an oversized image error notification is displayed.
   */
  async verifyOversizedPhotoError() {
    const avatarError = this.page.locator('text=/Avatar must be under 5 MB|Image size exceeds maximum 15MB limit/i').first();
    await expect(avatarError).toBeVisible({ timeout: 10000 });
  }
}

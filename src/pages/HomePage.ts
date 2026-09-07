import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model representing the Eve Vakh Home Page.
 */
export class HomePage extends BasePage {
  readonly webLink: Locator;
  readonly logo: Locator;

  constructor(page: Page) {
    super(page);
    // Primary locator: link with text "web" or href pointing to sign-in
    this.webLink = page.locator('a[href*="/auth/sign-in"]').or(page.getByRole('link', { name: /^web$/i }));
    this.logo = page.getByText('vakh', { exact: true });
  }

  /**
   * Navigates to the Eve Vakh Home Page.
   */
  async goto() {
    await this.navigateTo('/');
  }

  /**
   * Clicks on the 'web' link to navigate to sign-in section.
   */
  async clickWebLink() {
    if (this.page.url().includes('/auth/sign-in')) {
      return;
    }
    await expect(this.webLink).toBeVisible({ timeout: 15000 });
    await this.webLink.click();
  }
}

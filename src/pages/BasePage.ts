import { Page, Locator, expect } from '@playwright/test';
import { APP_CONFIG } from '../config/constants';

/**
 * Base Page Object Model providing shared utilities and navigation helpers.
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates to a specific path relative to the base URL.
   */
  async navigateTo(path: string = '/') {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Waits for the current URL to match a target pattern.
   */
  async waitForUrlPattern(pattern: RegExp | string, timeout: number = APP_CONFIG.DEFAULT_TIMEOUT) {
    await expect(this.page).toHaveURL(pattern, { timeout });
  }

  /**
   * Captures a screenshot and saves it.
   */
  async captureScreenshot(name: string) {
    await this.page.screenshot({ path: `test-reports/test-results/${name}.png`, fullPage: true });
  }
}

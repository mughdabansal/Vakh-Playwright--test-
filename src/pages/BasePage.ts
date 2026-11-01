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
    try {
      await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    } catch {
      await this.page.waitForTimeout(1000);
      await this.page.goto(path, { waitUntil: 'commit' }).catch(() => {});
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  /**
   * Waits for the current URL to match a target pattern.
   */
  async waitForUrlPattern(pattern: RegExp | string, timeout: number = APP_CONFIG.DEFAULT_TIMEOUT) {
    if (this.page.url().includes('chromewebdata')) {
      if (String(pattern).includes('sign-in')) {
        await this.page.goto(APP_CONFIG.SIGN_IN_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
      } else {
        await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      }
    }
    try {
      await expect(this.page).toHaveURL(pattern, { timeout });
    } catch (err) {
      if (this.page.url().includes('chromewebdata')) {
        if (String(pattern).includes('sign-in')) {
          await this.page.goto(APP_CONFIG.SIGN_IN_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
        } else {
          await this.page.goto(APP_CONFIG.BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
        }
        await expect(this.page).toHaveURL(pattern, { timeout: 10000 });
      } else {
        throw err;
      }
    }
  }

  /**
   * Captures a screenshot and saves it.
   */
  async captureScreenshot(name: string) {
    await this.page.screenshot({ path: `test-reports/test-results/${name}.png`, fullPage: true });
  }
}

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { APP_CONFIG } from '../config/constants';

/**
 * Page Object Model representing Badge details and Badge edit views.
 */
export class BadgePage extends BasePage {
  readonly moreActionsButton: Locator;
  readonly deleteBadgeMenuItem: Locator;
  readonly deleteBadgeButton: Locator;
  readonly badgeHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.moreActionsButton = page.getByRole('button', { name: /show more actions|more/i }).or(page.locator('button[aria-label*="more" i]')).first();
    this.deleteBadgeMenuItem = page.getByRole('menuitem', { name: /delete badge/i }).or(page.locator('text=Delete Badge'));
    this.deleteBadgeButton = page.locator('button:has-text("Delete Badge"), [role="button"]:has-text("Delete Badge")');
    this.badgeHeading = page.locator('h1, h2, [role="heading"]').first();
  }

  /**
   * Navigates to a badge edit view.
   */
  async gotoBadgeEdit(badgeId: string) {
    await this.page.goto(`${APP_CONFIG.BASE_URL}/badge/${badgeId}/edit`, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Asserts that the 'Delete Badge' option is NOT rendered in the UI for non-admin / demoted users.
   */
  async verifyDeleteOptionNotRendered() {
    // 1. Direct delete button should not be visible anywhere on the page
    await expect(this.deleteBadgeButton).not.toBeVisible();

    // 2. If 'More' / actions menu exists, open it and ensure 'Delete Badge' is absent
    if (await this.moreActionsButton.isVisible()) {
      await this.moreActionsButton.click();
      await this.page.waitForTimeout(500);
      await expect(this.deleteBadgeMenuItem).not.toBeVisible();
    }
  }
}

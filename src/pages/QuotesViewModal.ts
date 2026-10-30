import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { FormManagementPage } from './FormManagementPage';

/**
 * Page Object representing the Quotes View Modal / Sheet that opens
 * when clicking on the Quotes button / counter of any post card.
 */
export class QuotesViewModal extends BasePage {
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly bottomCloseButton: Locator;
  readonly headerCount: Locator;
  readonly tablist: Locator;
  readonly popularTab: Locator;
  readonly latestTab: Locator;
  readonly copyLinkButton: Locator;
  readonly quoteThisPostButton: Locator;
  readonly destinationChips: Locator;
  readonly quoteCards: Locator;

  constructor(page: Page) {
    super(page);

    this.modal = page.getByRole('dialog')
      .or(page.locator('[role="dialog"]'))
      .filter({ has: page.locator('text=/quote/i') })
      .first();

    this.closeButton = this.modal.getByRole('button', { name: /^close$/i })
      .or(this.modal.locator('button[aria-label="Close"]'))
      .first();

    this.bottomCloseButton = this.modal.getByRole('button', { name: /close quotes/i })
      .or(this.modal.locator('button[aria-label*="Close quotes" i]'))
      .first();

    this.headerCount = this.modal.locator('div[dir="auto"], span, h1, h2, [role="heading"]')
      .filter({ hasText: /^\d+\s+quotes?$/i })
      .first();

    this.tablist = this.modal.getByRole('tablist')
      .or(this.modal.locator('div[role="tablist"], div:has(> [role="tab"])'))
      .first();

    this.popularTab = this.tablist.getByRole('tab', { name: /popular/i })
      .or(this.modal.locator('[role="tab"], div[dir="auto"]').filter({ hasText: /^popular$/i }))
      .first();

    this.latestTab = this.tablist.getByRole('tab', { name: /latest/i })
      .or(this.modal.locator('[role="tab"], div[dir="auto"]').filter({ hasText: /^latest$/i }))
      .first();

    this.copyLinkButton = this.modal.getByRole('button', { name: /copy link/i })
      .or(this.modal.locator('button[aria-label*="Copy link" i]'))
      .first();

    this.quoteThisPostButton = this.modal.getByRole('button', { name: /quote this post$/i })
      .or(this.modal.locator('button[aria-label*="Quote this post" i]'))
      .first();

    this.destinationChips = this.modal.locator('button[aria-label*="Quote this post to" i], div:has(> button[aria-label*="Quote this post to" i])');

    this.quoteCards = this.modal.locator('div:has(> div:has-text("/")):has-text("ago"), [data-testid*="quote-card"]');
  }

  /**
   * Navigates into an owned form (e.g. 'posts') and opens the Quotes view for a post.
   */
  async openQuotesViewForPost(formName: string = 'posts') {
    const formMgmt = new FormManagementPage(this.page);
    await formMgmt.openOwnForm(formName);
    await this.page.waitForTimeout(1500);

    // Wait for form posts and locate quote buttons
    await this.page.locator('text=/loading/i').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    const quoteButton = this.page.locator('button[aria-label*="Quotes" i], button[aria-label*="Quote" i]')
      .locator('visible=true')
      .first();

    await expect(quoteButton).toBeVisible({ timeout: 20000 });
    await quoteButton.scrollIntoViewIfNeeded();
    await quoteButton.click();
    await this.page.waitForTimeout(1500);

    // Ensure quotes modal is visible
    await expect(this.modal).toBeVisible({ timeout: 15000 });
  }

  /**
   * Returns a locator for a dynamic form tab (e.g. '/POSTS' or '/posts') strictly within the navigation tablist.
   */
  getFormTab(formName: string): Locator {
    const pattern = new RegExp(`^\\/?${formName}$`, 'i');
    return this.tablist.getByRole('tab', { name: pattern })
      .or(this.tablist.locator('[role="tab"], div[dir="auto"]').filter({ hasText: pattern }))
      .first();
  }

  /**
   * Returns all dynamic form tabs (tabs in the tablist excluding Popular and Latest).
   */
  getAllFormTabs(): Locator {
    return this.tablist.getByRole('tab')
      .filter({ hasNotText: /popular|latest/i });
  }

  /**
   * Dismisses the modal using the bottom Close quotes button or Escape key.
   */
  async dismiss() {
    if (await this.bottomCloseButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.bottomCloseButton.click({ force: true });
    } else if (await this.closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.closeButton.click({ force: true });
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(1000);
  }
}

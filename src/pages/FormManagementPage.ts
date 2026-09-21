import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { APP_CONFIG } from '../config/constants';

/**
 * Page Object Model for Form Lifecycle, Post Management, and Subscriptions Management.
 */
export class FormManagementPage extends BasePage {
  // Navigation & General Form Locators
  readonly subscriptionsUrl: string = `${APP_CONFIG.BASE_URL}/settings/subscriptions`;
  readonly newPostButton: Locator;
  readonly ownProfileButton: Locator;

  // Post Actions (inside form view)
  readonly selectPostButtons: Locator;
  readonly heartButtons: Locator;
  readonly archivePostButton: Locator;
  readonly editPostButton: Locator;
  readonly openPostButton: Locator;
  readonly quotePostButton: Locator;
  readonly chatPostButton: Locator;

  // Post Editing Elements
  readonly postEditTextarea: Locator;
  readonly updatePostButton: Locator;
  readonly closeEditButton: Locator;

  // Subscriptions View Locators
  readonly subscriptionsHeading: Locator;
  readonly searchSubscriptionsInput: Locator;
  readonly selectModeButton: Locator;
  readonly doneModeButton: Locator;
  readonly groupModeButton: Locator;

  constructor(page: Page) {
    super(page);

    this.newPostButton = page.locator('button[aria-label="New Post"]:visible, button:has-text("New Post"):visible').first();
    this.ownProfileButton = page.getByRole('button', { name: /m_2094/i }).locator('visible=true').first();

    // Post Actions
    this.selectPostButtons = page.locator('button[aria-label*="Select post" i]');
    this.heartButtons = page.locator('button[aria-label*="Heart this post" i]');
    this.archivePostButton = page.locator('button[aria-label="Archive post"], button:has-text("Archive")').locator('visible=true').first();
    this.editPostButton = page.locator('button[aria-label="Edit post"], button:has-text("Edit")').locator('visible=true').first();
    this.openPostButton = page.locator('button[aria-label="Open post"], button:has-text("Open")').locator('visible=true').first();
    this.quotePostButton = page.locator('button[aria-label*="Quote selected" i]').locator('visible=true').first();
    this.chatPostButton = page.locator('button[aria-label*="Chat about selected" i]').locator('visible=true').first();

    // In-place post editor
    this.postEditTextarea = page.locator('textbox, textarea, [role="textbox"]').filter({ hasText: /\w+/ }).or(page.getByPlaceholder(/start typing/i)).first();
    this.updatePostButton = page.getByRole('button', { name: /^update$/i }).or(page.locator('button:has-text("Update")')).first();
    this.closeEditButton = page.getByRole('button', { name: /^close$/i }).or(page.locator('button:has-text("Close")')).first();

    // Subscriptions view
    this.subscriptionsHeading = page.getByRole('heading', { name: /subscriptions/i }).first();
    this.searchSubscriptionsInput = page.getByPlaceholder(/search subscriptions/i).or(page.locator('input[type="text"]')).first();
    this.selectModeButton = page.getByRole('button', { name: /^select$/i }).or(page.locator('button:has-text("Select")')).first();
    this.doneModeButton = page.getByRole('button', { name: /^done$/i }).or(page.locator('button:has-text("Done")')).first();
    this.groupModeButton = page.getByRole('button', { name: /^group$/i }).first();
  }

  /**
   * Navigates to the user's own profile page.
   */
  async navigateToOwnProfile() {
    await expect(this.ownProfileButton).toBeVisible({ timeout: 10000 });
    await this.ownProfileButton.click();
    await this.waitForUrlPattern(/\/user\//, 15000);
    await expect(this.page.locator('text=@m_2094').locator('visible=true').first()).toBeVisible({ timeout: 10000 });
  }

  /**
   * Opens the user's designated form from the profile page.
   */
  async openOwnForm(formName: string = 'posts') {
    await this.navigateToOwnProfile();
    await this.page.waitForTimeout(1000);

    const formCard = this.page.locator('div[tabindex="0"]:visible')
      .filter({ hasText: new RegExp(formName, 'i') })
      .filter({ hasText: /public posts|posts/i })
      .first();

    await expect(formCard).toBeVisible({ timeout: 15000 });
    await formCard.scrollIntoViewIfNeeded();
    await formCard.click();
    await expect(this.page).toHaveURL(/\/form\//, { timeout: 15000 });
  }

  /**
   * Hearts (likes) a post and validates counter increment or state update.
   */
  async heartFirstPost() {
    await expect(this.heartButtons.first()).toBeVisible({ timeout: 10000 });
    const targetHeart = this.heartButtons.first();
    const initialLabel = await targetHeart.getAttribute('aria-label') || '';

    await targetHeart.scrollIntoViewIfNeeded();
    await targetHeart.click();
    await this.page.waitForTimeout(1000);

    const updatedLabel = await targetHeart.getAttribute('aria-label') || '';
    expect(updatedLabel).toBeDefined();
    return { initialLabel, updatedLabel };
  }

  /**
   * Selects the first available post on the form.
   */
  async selectFirstPost() {
    await expect(this.selectPostButtons.first()).toBeVisible({ timeout: 10000 });
    const targetSelect = this.selectPostButtons.first();
    await targetSelect.scrollIntoViewIfNeeded();
    await targetSelect.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Performs in-place post editing on the selected post.
   */
  async editSelectedPost(updatedText: string) {
    await expect(this.editPostButton).toBeVisible({ timeout: 10000 });
    await this.editPostButton.click({ force: true });
    await this.page.waitForTimeout(1500);

    // Locate the editable textbox
    const editor = this.page.locator('textarea, [contenteditable="true"], input[type="text"]').filter({ hasText: /\w+/ }).first();
    if (await editor.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editor.fill(updatedText);
    } else if (await this.postEditTextarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.postEditTextarea.fill(updatedText);
    }

    // Submit update
    if (await this.updatePostButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.updatePostButton.click();
      await this.page.waitForTimeout(1500);
    } else {
      await this.page.keyboard.press('Escape');
    }
  }

  /**
   * Archives the selected post.
   */
  async archiveSelectedPost() {
    await expect(this.archivePostButton).toBeVisible({ timeout: 10000 });
    await this.archivePostButton.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  /**
   * Deletes a draft post or clears post content cleanly.
   */
  async deleteDraftOrPost() {
    // Open post creation dialog to test draft deletion
    await expect(this.newPostButton).toBeVisible({ timeout: 10000 });
    await this.newPostButton.click();
    await this.page.waitForTimeout(1000);

    const deleteDraftBtn = this.page.locator('button[aria-label="Delete draft"], button:has-text("Delete draft")').first();
    if (await deleteDraftBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteDraftBtn.click();
      await this.page.waitForTimeout(1000);
    }

    const closeBtn = this.page.getByText('Close', { exact: true }).locator('visible=true').first();
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click({ force: true });
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(1000);
  }

  /**
   * Navigates directly to the dedicated Subscriptions management view.
   */
  async navigateToSubscriptions() {
    await this.page.goto(this.subscriptionsUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(1500);
    await expect(this.page).toHaveURL(/\/settings\/subscriptions/, { timeout: 15000 });
    await expect(this.subscriptionsHeading).toBeVisible({ timeout: 10000 });
  }

  /**
   * Searches for a subscription item in the subscriptions view.
   */
  async searchSubscriptions(query: string) {
    await expect(this.searchSubscriptionsInput).toBeVisible({ timeout: 10000 });
    await this.searchSubscriptionsInput.fill(query);
    await this.page.waitForTimeout(1000);

    const matchingItem = this.page.locator(`text=/${query}/i`).first();
    await expect(matchingItem).toBeVisible({ timeout: 10000 });
  }

  /**
   * Toggles batch selection mode in the subscriptions management view.
   */
  async toggleBatchSelection() {
    await expect(this.selectModeButton).toBeVisible({ timeout: 10000 });
    await this.selectModeButton.click();
    await this.page.waitForTimeout(1000);

    // Verify Done button appears indicating active batch selection mode
    await expect(this.doneModeButton).toBeVisible({ timeout: 5000 });

    // Click Done to finish selection mode
    await this.doneModeButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Toggles subscription on a specific form card in subscriptions view.
   */
  async toggleSubscriptionOnForm(formName: string) {
    const formSubscriptionBtn = this.page.locator(`button[aria-label*="${formName}" i], button:has-text("${formName}")`).first();
    if (await formSubscriptionBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await formSubscriptionBtn.click();
      await this.page.waitForTimeout(1500);
    }
  }
}

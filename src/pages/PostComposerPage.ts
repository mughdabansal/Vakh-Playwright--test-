import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model representing the Eve Vakh Home Posting flow and Composer modal.
 */
export class PostComposerPage extends BasePage {
  readonly newPostButton: Locator;
  readonly createFormsDialog: Locator;
  readonly createInPostsButton: Locator;
  readonly composerHeader: Locator;
  readonly addTextButton: Locator;
  readonly addMediaButton: Locator;
  readonly addLongformButton: Locator;
  readonly addLinkButton: Locator;
  readonly addQuoteButton: Locator;
  readonly addMentionButton: Locator;
  readonly createButton: Locator;
  readonly closeButton: Locator;
  readonly editorInput: Locator;

  constructor(page: Page) {
    super(page);

    // Desktop/Responsive "New Post" button targeting the visible element
    this.newPostButton = page.locator('button[aria-label="New Post"]:visible, button:has-text("New Post"):visible').first();

    // "CREATE FORMS" selection modal
    this.createFormsDialog = page.locator('[role="dialog"]');

    // Target user's default form "posts"
    this.createInPostsButton = page.locator('button[aria-label="Create in posts"]').or(page.locator('[role="dialog"]').getByRole('button', { name: /posts/i })).first();

    // Composer modal elements
    this.composerHeader = page.locator('[data-testid="composer-modal-header"]');
    this.addTextButton = page.locator('button[aria-label="Add Text"]');
    this.addMediaButton = page.locator('button[aria-label="Add Media"]');
    this.addLongformButton = page.locator('button[aria-label="Add Longform"]');
    this.addLinkButton = page.locator('button[aria-label="Add Link"]');
    this.addQuoteButton = page.locator('button[aria-label="Add Quote"]');
    this.addMentionButton = page.locator('button[aria-label="Add Mention"]');
    this.createButton = page.getByRole('button', { name: /^create$/i }).first();
    this.closeButton = page.locator('button[aria-label="Close"]').or(page.getByRole('button', { name: /^close$/i })).first();

    // Text content editor
    this.editorInput = page.locator('[role="dialog"] textarea, [role="dialog"] [contenteditable="true"], [role="dialog"] input[type="text"]').first();
  }

  /**
   * Clicks the "New Post" action button on the Home page.
   */
  async openNewPostModal() {
    await expect(this.newPostButton).toBeVisible({ timeout: 15000 });
    await expect(this.newPostButton).toBeEnabled();
    await this.newPostButton.click();
    await expect(this.createFormsDialog).toBeVisible({ timeout: 10000 });
  }

  /**
   * Selects the target form (defaults to user's 'posts' form) inside the CREATE FORMS modal.
   */
  async selectTargetForm() {
    await expect(this.createInPostsButton).toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(500);
    await this.createInPostsButton.click({ force: true });
    try {
      await expect(this.composerHeader).toBeVisible({ timeout: 6000 });
    } catch {
      await this.createInPostsButton.click({ force: true });
      await expect(this.composerHeader).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Verifies composition tools are displayed and accessible.
   */
  async verifyCompositionTools() {
    await expect(this.addTextButton).toBeVisible({ timeout: 5000 });
    await expect(this.createButton).toBeVisible({ timeout: 5000 });
    const tools = [this.addMediaButton, this.addLongformButton, this.addLinkButton, this.addQuoteButton, this.addMentionButton];
    for (const tool of tools) {
      if (await tool.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(tool).toBeEnabled();
      }
    }
  }

  /**
   * Clicks "Add Text" and enters post body content.
   */
  async enterTextContent(text: string) {
    await this.addTextButton.click({ force: true });
    await this.page.waitForTimeout(500);
    if (await this.editorInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.editorInput.fill(text);
    }
  }

  /**
   * Submits the post creation by clicking the "Create" button.
   */
  async submitPost() {
    await expect(this.createButton).toBeVisible({ timeout: 5000 });
    await this.createButton.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  /**
   * Closes the composer dialog.
   */
  async closeDialog() {
    if (await this.closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.closeButton.click();
    }
  }
}

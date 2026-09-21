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
  readonly addPollButton: Locator;
  readonly pollQuestionInput: Locator;
  readonly pollOption1Input: Locator;
  readonly pollOption2Input: Locator;
  readonly addOptionButton: Locator;
  readonly removePollButton: Locator;
  readonly submitVoteButton: Locator;

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
    this.createButton = page.locator('[role="dialog"] button[aria-label="Create post"], [role="dialog"] button:has-text("Create"), button[aria-label="Create post"], button:has-text("Create")').first();
    this.closeButton = page.locator('button[aria-label="Close"], button[aria-label*="Close create post" i], button:has-text("Close")').or(page.getByRole('button', { name: /close/i })).first();

    // Text content editor
    this.editorInput = page.locator('[role="dialog"] textarea, [role="dialog"] [contenteditable="true"], [role="dialog"] input[type="text"]').first();

    // Poll field & Composer elements
    this.addPollButton = page.locator('button:has-text("Add poll"), [role="button"]:has-text("Add poll")').first();
    this.pollQuestionInput = page.getByPlaceholder(/question/i).or(page.locator('input[aria-label*="Question" i]')).first();
    this.pollOption1Input = page.getByPlaceholder(/option 1/i).or(page.locator('input[aria-label*="Option 1" i]')).first();
    this.pollOption2Input = page.getByPlaceholder(/option 2/i).or(page.locator('input[aria-label*="Option 2" i]')).first();
    this.addOptionButton = page.locator('button:has-text("Add option"), [role="button"]:has-text("Add option")').first();
    this.removePollButton = page.locator('button:has-text("Remove poll"), [role="button"]:has-text("Remove poll")').first();
    this.submitVoteButton = page.getByRole('button', { name: /^vote$/i }).or(page.locator('button:has-text("Vote")')).first();
  }

  /**
   * Clicks the "New Post" action button on the Home page.
   */
  async openNewPostModal() {
    await expect(this.newPostButton).toBeVisible({ timeout: 15000 });
    await expect(this.newPostButton).toBeEnabled();
    await this.page.waitForTimeout(500);
    await this.newPostButton.click({ force: true });
    await expect(this.createFormsDialog).toBeVisible({ timeout: 10000 });
  }

  /**
   * Selects the target form (defaults to user's 'posts' form) inside the CREATE FORMS modal.
   */
  async selectTargetForm() {
    const targetBtn = this.createInPostsButton.or(this.page.locator('[role="dialog"]').getByRole('button', { name: /posts/i })).or(this.page.locator('[role="dialog"]').getByText(/posts/i)).first();
    await expect(targetBtn).toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(500);
    await targetBtn.click({ force: true });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verifies composition tools are displayed and accessible.
   */
  async verifyCompositionTools() {
    const addTextBtn = this.addTextButton.or(this.page.getByRole('button', { name: /add text/i }));
    await expect(addTextBtn).toBeVisible({ timeout: 5000 });
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
    const addTextBtn = this.addTextButton.or(this.page.getByRole('button', { name: /add text/i })).or(this.page.locator('button:has-text("Add Text")')).first();
    if (await addTextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addTextBtn.click({ force: true });
      await this.page.waitForTimeout(500);
    }
    if (await this.editorInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.editorInput.fill(text);
    }
  }

  /**
   * Submits the post creation by clicking the "Create" button.
   */
  async submitPost() {
    await expect(this.createButton).toBeVisible({ timeout: 5000 });
    await this.createButton.click();
    // Wait for "Post created" toast or persistence
    const toast = this.page.locator('text=/post created/i').first();
    await toast.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(4000);
  }

  /**
   * Closes the composer dialog.
   */
  async closeDialog() {
    if (await this.closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.closeButton.click();
    }
  }

  /**
   * Creates a new form configured with the "Poll" field.
   * Returns the view URL for the newly created form.
   */
  async createFormWithPollField(formName: string): Promise<string> {
    // Navigate to user profile
    const profileBtn = this.page.getByRole('button', { name: /m_2094/i }).locator('visible=true').first();
    await expect(profileBtn).toBeVisible({ timeout: 10000 });
    await profileBtn.click();
    await this.page.waitForTimeout(2000);

    // Click More -> New Form
    const moreBtn = this.page.getByRole('button', { name: /more/i }).first();
    await expect(moreBtn).toBeVisible({ timeout: 10000 });
    await moreBtn.click();
    await this.page.waitForTimeout(1000);

    const newFormBtn = this.page.getByText(/new form/i).first();
    await expect(newFormBtn).toBeVisible({ timeout: 10000 });
    await newFormBtn.click();
    await this.page.waitForTimeout(2000);

    // Set Form Name
    const formNameInput = this.page.getByPlaceholder(/form name/i).first();
    await expect(formNameInput).toBeVisible({ timeout: 10000 });
    await formNameInput.fill(formName);

    // Click "Add Poll field"
    const addPollFieldBtn = this.page.locator('button[aria-label="Add Poll field"], button:has-text("Poll")').first();
    await expect(addPollFieldBtn).toBeVisible({ timeout: 10000 });
    await addPollFieldBtn.click();
    await this.page.waitForTimeout(1500);

    // If field settings modal opened, close it
    const closeSettingsBtn = this.page.locator('button[aria-label="Close field settings"], button:has-text("Close")').last();
    if (await closeSettingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeSettingsBtn.click();
      await this.page.waitForTimeout(1000);
    }

    // Save Form
    const saveFormBtn = this.page.locator('button[aria-label="Save Form"], button:has-text("Save Form")').first();
    await expect(saveFormBtn).toBeVisible({ timeout: 10000 });
    await saveFormBtn.click();
    await this.page.waitForTimeout(3000);

    // The URL becomes /form/<id>/edit?tab=access
    const editUrl = this.page.url();
    const formViewUrl = editUrl.split('/edit')[0];
    return formViewUrl;
  }

  /**
   * Fills out a poll within the post composer.
   */
  async fillPoll(question: string, options: string[]) {
    // Click "Add poll" button if present
    if (await this.addPollButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.addPollButton.click();
      await this.page.waitForTimeout(1000);
    }

    // Fill Question
    await expect(this.pollQuestionInput).toBeVisible({ timeout: 5000 });
    await this.pollQuestionInput.fill(question);

    // Fill Options
    if (options[0]) {
      await expect(this.pollOption1Input).toBeVisible({ timeout: 5000 });
      await this.pollOption1Input.fill(options[0]);
    }
    if (options[1]) {
      await expect(this.pollOption2Input).toBeVisible({ timeout: 5000 });
      await this.pollOption2Input.fill(options[1]);
    }

    // Add extra options if provided
    for (let i = 2; i < options.length; i++) {
      if (await this.addOptionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.addOptionButton.click();
        await this.page.waitForTimeout(500);
        const nthInput = this.page.getByPlaceholder(new RegExp(`option ${i + 1}`, 'i')).first();
        if (await nthInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nthInput.fill(options[i]);
        }
      }
    }
  }

  /**
   * Casts a vote on a specific poll option and submits the vote.
   */
  async voteOnPollOption(optionText: string) {
    const optionLocator = this.page.locator(`text="${optionText}"`).or(this.page.getByText(optionText)).first();
    await expect(optionLocator).toBeVisible({ timeout: 10000 });
    await optionLocator.click();
    await this.page.waitForTimeout(1000);

    await expect(this.submitVoteButton).toBeVisible({ timeout: 5000 });
    await this.submitVoteButton.click();
    await this.page.waitForTimeout(2500);
  }

  /**
   * Verifies that the poll post is rendered with the expected question and choices.
   */
  async verifyPollRendered(question: string, options: string[]) {
    const questionLocator = this.page.getByText(question).first();
    await expect(questionLocator).toBeVisible({ timeout: 15000 });

    for (const opt of options) {
      const optLocator = this.page.getByText(opt).first();
      await expect(optLocator).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Verifies that a vote has been registered (percentage or voter count updated).
   */
  async verifyVoteRegistered() {
    const voterCountLocator = this.page.locator('text=/\\d+\\s+voter/i').first();
    await expect(voterCountLocator).toBeVisible({ timeout: 10000 });
  }
}

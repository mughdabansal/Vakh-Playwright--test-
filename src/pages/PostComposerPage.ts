import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { APP_CONFIG } from '../config/constants';

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
    this.createButton = page.locator('[role="dialog"] button[aria-label="Create post"], [role="dialog"] button:has-text("Create"), button[aria-label="Create post"], button:has-text("Create")').or(page.getByRole('button', { name: /create post|create/i })).first();
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
    this.submitVoteButton = page.getByRole('button', { name: /^vote$/i }).or(page.locator('button:has-text("Vote"), [role="button"]:has-text("Vote")')).first();
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
  async selectTargetForm(formName: string = 'posts') {
    const targetFormBtn = this.page.locator(`[role="dialog"] button[aria-label*="Create in ${formName}" i], [role="dialog"] button[aria-label="Create in posts"]`).first();

    // If target form button is not yet in view in virtualized list, scroll modal container
    for (let i = 0; i < 10; i++) {
      if (await targetFormBtn.isVisible().catch(() => false)) {
        break;
      }
      const box = await this.page.locator('[role="dialog"]').boundingBox();
      if (box) {
        await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await this.page.mouse.wheel(0, 400);
      }
      await this.page.waitForTimeout(300);
    }

    let targetBtn = targetFormBtn;
    if (!(await targetBtn.isVisible().catch(() => false))) {
      targetBtn = this.page.locator('[role="dialog"] button[aria-label*="Create in"]').first();
    }

    await targetBtn.scrollIntoViewIfNeeded();
    await expect(targetBtn).toBeVisible({ timeout: 15000 });
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
    // Blur any focused input so React Native Web state is committed before click
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(500);

    const createBtn = this.page.locator('[role="dialog"] button[aria-label="Create post"], [role="dialog"] button:has-text("Create")').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await expect(createBtn).toBeEnabled({ timeout: 10000 });

    const publishPromise = this.page.waitForResponse(
      res => res.url().includes('/publish') || (res.url().includes('/api/posts/') && res.request().method() === 'POST'),
      { timeout: 15000 }
    ).catch(() => null);

    await createBtn.click();
    await publishPromise;

    // Wait for "Post created" toast or dialog dismissal
    const toast = this.page.locator('text=/post created/i').first();
    await toast.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await expect(this.page.locator('[role="dialog"]')).toBeHidden({ timeout: 20000 }).catch(() => {});
    await this.page.waitForTimeout(2000);
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
    // Navigate directly to form builder
    await this.page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(1500);

    // Set Form Name
    const formNameInput = this.page.getByPlaceholder(/form name/i).or(this.page.locator('input[aria-label*="Form Name" i]')).first();
    await expect(formNameInput).toBeVisible({ timeout: 15000 });
    await formNameInput.fill(formName);

    // Click "Add Poll field" (scroll into view to ensure visibility in headless CI)
    const addPollFieldBtn = this.page.locator('button[aria-label="Add Poll field"]').or(this.page.locator('button:has-text("Poll")')).first();
    await addPollFieldBtn.scrollIntoViewIfNeeded();
    await expect(addPollFieldBtn).toBeVisible({ timeout: 10000 });
    await addPollFieldBtn.click();
    await this.page.waitForTimeout(1500);

    // If field settings modal opened, close it
    const closeSettingsBtn = this.page.getByRole('button', { name: /^close$/i }).or(this.page.locator('button:has-text("Close"), [role="button"]:has-text("Close")')).last();
    if (await closeSettingsBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await closeSettingsBtn.click({ force: true });
      await this.page.waitForTimeout(1000);
    }
    if (await this.page.locator('text=FIELD SETTINGS').isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1000);
    }

    // Save Form
    const saveFormBtn = this.page.locator('button[aria-label="Save Form"], button:has-text("Save Form"), [role="button"]:has-text("Save Form")').first();
    await expect(saveFormBtn).toBeVisible({ timeout: 10000 });
    await saveFormBtn.scrollIntoViewIfNeeded();
    await saveFormBtn.click();

    // Await server persistence redirect from /form/new/edit to /form/<id>/edit
    await this.page.waitForURL(url => url.pathname.includes('/form/') && !url.pathname.includes('/form/new'), { timeout: 30000 });
    await this.page.waitForTimeout(1000);

    const editUrl = this.page.url();
    const formViewUrl = editUrl.split('/edit')[0];
    return formViewUrl;
  }

  /**
   * Fills out a poll within the post composer.
   */
  async fillPoll(question: string, options: string[]) {
    // Click "Add poll" button if question input is not yet visible
    const isQVisible = await this.pollQuestionInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isQVisible) {
      if (await this.addPollButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        const draftPromise = this.page.waitForResponse(
          res => res.url().includes('/api/posts') && res.request().method() === 'POST',
          { timeout: 10000 }
        ).catch(() => null);
        await this.addPollButton.click();
        await draftPromise;
        await this.page.waitForTimeout(1000);
      }
    }

    // Fill Question
    await expect(this.pollQuestionInput).toBeVisible({ timeout: 10000 });
    await this.pollQuestionInput.click();
    await this.pollQuestionInput.fill(question);
    await this.page.waitForTimeout(500);

    // Fill Options
    if (options[0]) {
      await expect(this.pollOption1Input).toBeVisible({ timeout: 5000 });
      await this.pollOption1Input.click();
      await this.pollOption1Input.fill(options[0]);
      await this.page.waitForTimeout(500);
    }
    if (options[1]) {
      await expect(this.pollOption2Input).toBeVisible({ timeout: 5000 });
      await this.pollOption2Input.click();
      await this.pollOption2Input.fill(options[1]);
      await this.page.waitForTimeout(500);
    }

    // Add extra options if provided
    for (let i = 2; i < options.length; i++) {
      if (await this.addOptionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.addOptionButton.click();
        await this.page.waitForTimeout(500);
        const nthInput = this.page.getByPlaceholder(new RegExp(`option ${i + 1}`, 'i')).first();
        if (await nthInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nthInput.click();
          await nthInput.fill(options[i]);
          await this.page.waitForTimeout(500);
        }
      }
    }

    // Blur active input to ensure state is committed
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Casts a vote on a specific poll option and submits the vote.
   */
  async voteOnPollOption(optionText: string) {
    const optionLocator = this.page.locator(`text="${optionText}"`).or(this.page.getByText(optionText)).first();
    await expect(optionLocator).toBeVisible({ timeout: 10000 });
    await optionLocator.scrollIntoViewIfNeeded();
    await optionLocator.click();
    await this.page.waitForTimeout(1000);

    await expect(this.submitVoteButton).toBeVisible({ timeout: 10000 });
    await this.submitVoteButton.click();
    await this.page.waitForTimeout(2500);
  }

  /**
   * Verifies that the poll post is rendered with the expected question and choices.
   */
  async verifyPollRendered(question: string, options: string[]) {
    let questionLocator = this.page.getByText(question).first();
    const isVisible = await questionLocator.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      await this.page.reload();
      await this.page.waitForTimeout(3000);
    }
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
    const voteIndicator = this.page.locator('text=/\\d+%/').or(this.page.locator('text=/\\d+\\s+voter/i')).first();
    await expect(voteIndicator).toBeVisible({ timeout: 15000 });
  }
}

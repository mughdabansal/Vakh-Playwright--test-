import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { APP_CONFIG, TEST_USERS } from '../config/constants';

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

    // Desktop/Responsive "New Post" or "Index" button targeting the active composer entry point
    this.newPostButton = page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible, button[aria-label="New Post"]:visible, button:has-text("New Post"):visible').first();

    // "CREATE FORMS" selection modal
    this.createFormsDialog = page.locator('[role="dialog"]');

    // Target user's default form "posts"
    this.createInPostsButton = page.locator('button[aria-label="Create in posts"]').or(page.locator('[role="dialog"]').getByRole('button', { name: /posts/i })).first();

    // Composer modal elements
    this.composerHeader = page.locator('[data-testid="composer-modal-header"], [role="dialog"] div:has-text("NEW POST IN"), [role="dialog"] [dir="auto"]:has-text("NEW POST IN"), [role="dialog"] h1:has-text("NEW POST IN")').first();
    this.addTextButton = page.locator('[role="dialog"] button[aria-label="Add Text"], [role="dialog"] button:has-text("Text")').first();
    this.addMediaButton = page.locator('[role="dialog"] button[aria-label="Add Media"], [role="dialog"] button:has-text("Media")').first();
    this.addLongformButton = page.locator('[role="dialog"] button[aria-label="Add Longform"], [role="dialog"] button:has-text("Longform")').first();
    this.addLinkButton = page.locator('[role="dialog"] button[aria-label="Add Link"], [role="dialog"] button:has-text("Link")').first();
    this.addQuoteButton = page.locator('[role="dialog"] button[aria-label="Add Quote"], [role="dialog"] button:has-text("Quote")').first();
    this.addMentionButton = page.locator('[role="dialog"] button[aria-label="Add Mention"], [role="dialog"] button:has-text("Mention")').first();
    this.createButton = page.locator('[role="dialog"] button[aria-label="Create post"], [role="dialog"] button:has-text("Create")').first();
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
    // If a composer or dialog is already open, close/dismiss it cleanly first
    for (let i = 0; i < 2; i++) {
      const closeComposerBtn = this.page.locator('button[aria-label*="Close create post" i], [role="dialog"] button:has-text("Close"), button[aria-label="Close"]').first();
      if (await closeComposerBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeComposerBtn.click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(500);
        const discardBtn = this.page.locator('button:has-text("Discard"), button:has-text("Delete draft"), button:has-text("Don\'t save")').first();
        if (await discardBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await discardBtn.click({ force: true }).catch(() => {});
          await this.page.waitForTimeout(500);
        }
      }
    }

    const indexBtn = this.page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible, button[aria-label="New Post"]:visible, button:has-text("New Post"):visible').first();
    await expect(indexBtn).toBeVisible({ timeout: 15000 });
    
    // Check if Index drawer is already open
    const searchInput = this.page.locator('input[placeholder*="Find" i]').first();
    if (!(await searchInput.isVisible({ timeout: 1000 }).catch(() => false))) {
      await indexBtn.click();
      await this.page.waitForTimeout(1000);
      if (!(await searchInput.isVisible({ timeout: 2000 }).catch(() => false))) {
        await indexBtn.click({ force: true });
        await this.page.waitForTimeout(1000);
      }
    }
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Selects the target form (defaults to user's 'posts' form) inside the CREATE FORMS modal.
   */
  async selectTargetForm(formName: string = 'posts') {
    const searchInput = this.page.locator('input[placeholder*="Find" i]').first();
    if (!(await searchInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      const indexBtn = this.page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible').first();
      if (await indexBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await indexBtn.click();
        await this.page.waitForTimeout(1000);
      }
    }
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Filter using search box
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.pressSequentially(formName, { delay: 60 });
    await this.page.waitForTimeout(1500);

    // Look specifically for the default user's form row: e.g. "posts @m_2094"
    const userFormRow = this.page.locator('button[aria-label*="Open form" i]').filter({ hasText: new RegExp(formName, 'i') }).filter({ hasText: `@${TEST_USERS.DEFAULT_USER.username}` }).first();
    await userFormRow.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await userFormRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Find the sibling "+" button in the same row
      const userPlus = userFormRow.locator('xpath=following::button[contains(@aria-label, "New post")][1]');
      if (await userPlus.isVisible({ timeout: 2000 }).catch(() => false)) {
        await userPlus.click();
      } else {
        await userFormRow.click();
        await this.page.waitForTimeout(1000);
        const formNewPostBtn = this.page.locator('button[aria-label="New Post"]:visible, button:has-text("New Post"):visible').first();
        if (await formNewPostBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await formNewPostBtn.click();
        }
      }
    } else {
      // Fallback: any "+" button for the form
      const plusBtns = this.page.locator(`button[aria-label*="New post in ${formName}" i]`);
      await plusBtns.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      const count = await plusBtns.count();
      if (count > 0) {
        const targetPlus = count > 1 ? plusBtns.nth(1) : plusBtns.first();
        await targetPlus.click();
      } else {
        const formCard = this.page.locator('button, [role="button"]').filter({ hasText: new RegExp(formName, 'i') }).filter({ hasNotText: /ago|#|draft/i }).first();
        if (await formCard.isVisible({ timeout: 3000 }).catch(() => false)) {
          await formCard.click();
        }
      }
    }
    await this.page.waitForTimeout(1000);

    // If navigated to a form page, click "New Post" button on that page
    const formNewPostBtn = this.page.locator('button:has-text("New Post"), button[aria-label="New Post"]').first();
    if (await formNewPostBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await formNewPostBtn.click();
      await this.page.waitForTimeout(1000);
    }

    // Verify dialog transitioned to composer
    const composerDialog = this.page.locator('[role="dialog"]').filter({
      has: this.page.locator('button[aria-label="Create post"], button:has-text("Create")')
    }).first();
    if (!(await composerDialog.isVisible({ timeout: 4000 }).catch(() => false))) {
      const fallbackPlus = this.page.locator(`button[aria-label*="New post in ${formName}" i]`).first();
      if (await fallbackPlus.isVisible().catch(() => false)) {
        await fallbackPlus.click();
      } else if (await formNewPostBtn.isVisible().catch(() => false)) {
        await formNewPostBtn.click();
      }
    }
    await expect(composerDialog).toBeVisible({ timeout: 15000 });
    await this.page.waitForTimeout(500);

    // Clean up any stale restored media draft to ensure fresh composer state
    const deleteMediaBtns = composerDialog.locator('button:has-text("Delete media"), button[aria-label*="Delete media" i]');
    let delCount = await deleteMediaBtns.count();
    while (delCount > 0) {
      await deleteMediaBtns.first().click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(300);
      delCount = await deleteMediaBtns.count();
    }
  }

  async verifyCompositionTools() {
    const composerDialog = this.page.locator('[role="dialog"]').filter({ hasText: /NEW POST IN/i }).first();
    await expect(composerDialog).toBeVisible({ timeout: 15000 });
    await expect(this.composerHeader.or(this.createButton).first()).toBeVisible({ timeout: 10000 });

    // Expand tools toolbar if collapsed
    const addTextBtn = composerDialog.locator('button[aria-label="Add Text"], button:has-text("Text")').first();
    if (!(await addTextBtn.isVisible().catch(() => false))) {
      const addContentBtn = composerDialog.locator('button[aria-label="Add content"], button:has-text("Add")').first();
      if (await addContentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addContentBtn.click();
        await this.page.waitForTimeout(500);
      }
    }

    await expect(this.createButton).toBeVisible({ timeout: 5000 });
    const tools = [
      this.addTextButton,
      this.addMediaButton,
      this.addLongformButton,
      this.addLinkButton,
      this.addQuoteButton,
      this.addMentionButton,
    ];
    for (const tool of tools) {
      if (await tool.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(tool).toBeEnabled();
      }
    }
  }

  /**
   * Clicks "Add Text" and enters post body content.
   */
  async enterTextContent(text: string) {
    const composerDialog = this.page.locator('[role="dialog"]').filter({
      has: this.page.locator('button[aria-label="Create post"], button:has-text("Create")')
    }).first();
    await expect(composerDialog).toBeVisible({ timeout: 15000 });

    // Check if textarea is already visible
    let input = composerDialog.locator('textarea, [contenteditable="true"], input[type="text"]').first();
    let isInputVisible = await input.isVisible({ timeout: 1500 }).catch(() => false);

    if (!isInputVisible) {
      // Clean up any stale media draft that may hide text inputs
      const deleteMediaBtns = composerDialog.locator('button:has-text("Delete media"), button[aria-label*="Delete media" i], button[aria-label*="Delete" i]');
      if (await deleteMediaBtns.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteMediaBtns.first().click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(500);
      }

      // Check if textarea appeared after deleting media
      input = composerDialog.locator('textarea, [contenteditable="true"], input[type="text"]').first();
      isInputVisible = await input.isVisible({ timeout: 1000 }).catch(() => false);

      if (!isInputVisible) {
        // Open the "Add content" picker if visible
        const addContentBtn = composerDialog.locator('button[aria-label="Add content"]').first();
        if (await addContentBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addContentBtn.click();
          await this.page.waitForTimeout(600);
        }

        // Click "Text" option
        const textBtn = this.page.locator('button, [role="button"], [role="menuitem"]').filter({ hasText: /^Text$/i }).first();
        if (await textBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await textBtn.click();
          await this.page.waitForTimeout(600);
        }
      }
    }

    input = composerDialog.locator('textarea, [contenteditable="true"], input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.click();
    await input.fill(text);
    await this.page.waitForTimeout(500);
  }

  /**
   * Uploads an image or media attachment using file chooser event or input element.
   */
  async uploadMediaAttachment(filename: string, mimeType: string, buffer: Buffer) {
    const composerDialog = this.page.locator('[role="dialog"]').filter({
      has: this.page.locator('button[aria-label="Create post"], button:has-text("Create")')
    }).first();
    await expect(composerDialog).toBeVisible({ timeout: 15000 });

    // Allow time for any draft to restore, then clean up any stale restored media attachments
    await this.page.waitForTimeout(800);
    const staleDelBtns = composerDialog.locator('button:has-text("Delete media"), button[aria-label*="Delete media" i]');
    while (await staleDelBtns.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      await staleDelBtns.first().click().catch(() => {});
      await this.page.waitForTimeout(400);
    }

    let dropzoneBtn = composerDialog.locator('button[data-testid="media-add-button"], button[aria-label*="Add media" i], button:has-text("Add media or drop files")').first();

    // If dropzone button is not visible, open "Add content" -> "Media"
    if (!(await dropzoneBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      const addContentBtn = composerDialog.locator('button[aria-label="Add content"]').first();
      if (await addContentBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addContentBtn.click();
        await this.page.waitForTimeout(500);
      }
      const mediaBtn = this.page.locator('button, [role="button"], [role="menuitem"]').filter({ hasText: /^Media$/i }).first();
      if (await mediaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mediaBtn.click();
        await this.page.waitForTimeout(500);
      }
    }

    await expect(dropzoneBtn).toBeVisible({ timeout: 10000 });

    const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 15000 });
    await dropzoneBtn.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([{
      name: filename,
      mimeType: mimeType,
      buffer: buffer,
    }]);

    // Ensure the attached media item is rendered in the composer before proceeding
    const attachedPreview = composerDialog.locator('button[aria-label*="Delete media" i], button:has-text("Delete media"), div[data-expoimage="true"], img').filter({ hasNotText: /close|create/i }).first();
    await expect(attachedPreview).toBeVisible({ timeout: 15000 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Uploads multiple media attachments in a single batch file chooser selection.
   */
  async uploadMultipleMediaAttachments(files: Array<{ name: string; mimeType: string; buffer: Buffer }>) {
    const composerDialog = this.page.locator('[role="dialog"]').filter({
      has: this.page.locator('button[aria-label="Create post"], button:has-text("Create")')
    }).first();
    await expect(composerDialog).toBeVisible({ timeout: 15000 });

    // Allow time for any draft to restore, then clean up any stale restored media attachments
    await this.page.waitForTimeout(800);
    const staleDelBtns = composerDialog.locator('button:has-text("Delete media"), button[aria-label*="Delete media" i]');
    while (await staleDelBtns.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      await staleDelBtns.first().click().catch(() => {});
      await this.page.waitForTimeout(400);
    }

    let dropzoneBtn = composerDialog.locator('button[data-testid="media-add-button"], button[aria-label*="Add media" i], button:has-text("Add media or drop files")').first();

    if (!(await dropzoneBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      const addContentBtn = composerDialog.locator('button[aria-label="Add content"]').first();
      if (await addContentBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addContentBtn.click();
        await this.page.waitForTimeout(500);
      }
      const mediaBtn = this.page.locator('button, [role="button"], [role="menuitem"]').filter({ hasText: /^Media$/i }).first();
      if (await mediaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mediaBtn.click();
        await this.page.waitForTimeout(500);
      }
    }

    await expect(dropzoneBtn).toBeVisible({ timeout: 10000 });

    const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 15000 });
    await dropzoneBtn.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(files);

    // Ensure attached media items render in composer
    const attachedPreview = composerDialog.locator('button[aria-label*="Delete media" i], button:has-text("Delete media")').first();
    await expect(attachedPreview).toBeVisible({ timeout: 15000 });
    await this.page.waitForTimeout(500);
  }

  async submitPost() {
    const composerDialog = this.page.locator('[role="dialog"]').filter({
      has: this.page.locator('button[aria-label="Create post"], button:has-text("Create")')
    }).first();
    const createBtn = composerDialog.locator('button[aria-label="Create post"], button:has-text("Create")').first();
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await expect(createBtn).toBeEnabled({ timeout: 15000 });
    await createBtn.click();

    // Verify composer dialog is dismissed
    const activeComposer = composerDialog;
    await expect(activeComposer).toBeHidden({ timeout: 20000 });

    // If Index/Forms dialog remains open underneath, dismiss it to return to feed
    const remainingIndexDialog = this.page.locator('[role="dialog"]').filter({ hasText: /Index|Forms/i }).first();
    if (await remainingIndexDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      const closeBtn = remainingIndexDialog.locator('button[aria-label*="Close" i], button:has-text("Close")').first();
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        await this.page.keyboard.press('Escape');
      }
      await this.page.waitForTimeout(500);
    }

    await this.page.waitForTimeout(1000);
  }

  /**
   * Closes the composer dialog.
   */
  async closeDialog() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
    if (await this.closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.closeButton.click({ force: true }).catch(() => {});
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

    // Open Add Field picker
    const addFieldBtn = this.page.locator('button').filter({ hasText: /add field/i }).or(this.page.getByText('add_field')).last();
    if (await addFieldBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addFieldBtn.scrollIntoViewIfNeeded();
      await addFieldBtn.click();
      await this.page.waitForTimeout(600);
    }

    const pollCard = this.page.locator('button, [role="button"]')
      .filter({ hasText: /Poll/i })
      .filter({ hasText: /Let readers vote and see results/i })
      .first();
    if (await pollCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pollCard.click();
      await this.page.waitForTimeout(800);
    } else {
      const addPollFieldBtn = this.page.locator('button[aria-label="Add Poll field"]').or(this.page.locator('button:has-text("Poll")')).first();
      await addPollFieldBtn.scrollIntoViewIfNeeded();
      await addPollFieldBtn.click();
      await this.page.waitForTimeout(1000);
    }

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
    const addPollBtn = this.page.locator('[role="dialog"]')
      .locator('button, [role="button"], div[tabindex="0"], div')
      .filter({ hasText: /^Add poll$/i })
      .first();

    if (await addPollBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addPollBtn.click({ force: true });
      await this.page.waitForTimeout(1000);
    }

    // Fill Question
    await expect(this.pollQuestionInput).toBeVisible({ timeout: 15000 });
    await this.pollQuestionInput.click();
    await this.pollQuestionInput.fill(question);
    await this.page.waitForTimeout(500);

    // Fill Options
    if (options[0]) {
      await expect(this.pollOption1Input).toBeVisible({ timeout: 10000 });
      await this.pollOption1Input.click();
      await this.pollOption1Input.fill(options[0]);
      await this.page.waitForTimeout(500);
    }
    if (options[1]) {
      await expect(this.pollOption2Input).toBeVisible({ timeout: 10000 });
      await this.pollOption2Input.click();
      await this.pollOption2Input.fill(options[1]);
      await this.page.waitForTimeout(500);
    }

    // Add extra options if provided
    for (let i = 2; i < options.length; i++) {
      if (await this.addOptionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.addOptionButton.click({ force: true });
        await this.page.waitForTimeout(500);
        const nthInput = this.page.getByPlaceholder(new RegExp(`option ${i + 1}`, 'i')).first();
        if (await nthInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nthInput.click();
          await nthInput.fill(options[i]);
          await this.page.waitForTimeout(500);
        }
      }
    }
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

    if (await this.submitVoteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.submitVoteButton.click();
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Verifies that the poll post is rendered with the expected question and choices.
   */
  async verifyPollRendered(question: string, options: string[]) {
    const questionLocator = this.page.getByText(question).first();
    try {
      await expect(questionLocator).toBeVisible({ timeout: 15000 });
    } catch {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(3000);
      await expect(questionLocator).toBeVisible({ timeout: 15000 });
    }

    for (const opt of options) {
      const optLocator = this.page.getByText(opt).first();
      await expect(optLocator).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Verifies that a vote has been registered (percentage or voter count updated).
   */
  async verifyVoteRegistered() {
    const voteIndicator = this.page.locator('text=/\\d+%/')
      .or(this.page.locator('text=/\\d+\\s+vote/i'))
      .or(this.page.locator('text=/vote registered|voted/i'))
      .first();
    await expect(voteIndicator).toBeVisible({ timeout: 15000 });
  }
}

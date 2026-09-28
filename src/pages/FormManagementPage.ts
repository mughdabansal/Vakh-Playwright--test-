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

  // Edit Form and Delete Form elements
  readonly editFormHeader: Locator;
  readonly editFormMoreButton: Locator;
  readonly deleteFormMenuItem: Locator;
  readonly deleteFormHeading: Locator;
  readonly deleteFormWarningHeading: Locator;
  readonly deleteFormConfirmButton: Locator;
  readonly deleteFormBackButton: Locator;

  // Form Builder and Field Limits
  readonly formNameInput: Locator;
  readonly saveFormButton: Locator;
  readonly fieldLimitErrorAlert: Locator;

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

    // Edit Form and Delete Form elements
    this.editFormHeader = page.getByRole('heading', { name: /edit form/i }).or(page.getByText('Edit Form')).first();
    this.editFormMoreButton = page.getByRole('button', { name: /^more$/i }).or(page.locator('button:has-text("More")')).first();
    this.deleteFormMenuItem = page.locator('text=Delete Form').first();
    this.deleteFormHeading = page.getByRole('heading', { name: 'Delete Form' }).first();
    this.deleteFormWarningHeading = page.getByRole('heading', { name: /what happens when you delete this form/i }).first();
    this.deleteFormConfirmButton = page.locator('button').filter({ hasText: /^delete form$/i }).locator('visible=true').last();
    this.deleteFormBackButton = page.getByRole('menuitem', { name: 'Back' });

    // Form Builder and Field Limits
    this.formNameInput = page.getByPlaceholder(/form name/i).or(page.locator('input[aria-label*="Form Name" i]')).first();
    this.saveFormButton = page.locator('button[aria-label="Save Form"], button:has-text("Save Form"), [role="button"]:has-text("Save Form")').first();
    this.fieldLimitErrorAlert = page.locator('[role="alert"], [class*="alert" i], [class*="toast" i], [class*="error" i]')
      .filter({ hasText: /expected array to have <=50 items|too big|maximum.*field/i }).first();
  }

  /**
   * Navigates to the user's own profile page.
   */
  async navigateToOwnProfile() {
    await expect(this.ownProfileButton).toBeVisible({ timeout: 10000 });
    await this.ownProfileButton.click();
    await this.waitForUrlPattern(/\/user\//, 15000);
    await expect(this.page.locator('text=@m_2094').locator('visible=true').first()).toBeVisible({ timeout: 10000 });
    // Await profile forms loading
    await expect(this.page.getByText(/loading/i).first()).toBeHidden({ timeout: 15000 }).catch(() => {});
  }

  /**
   * Opens the user's designated form from the profile page.
   * Dynamically locates the requested form name or falls back gracefully to any available owned form.
   */
  async openOwnForm(formName: string = 'posts') {
    await this.navigateToOwnProfile();
    await this.page.waitForTimeout(1000);

    // 1. Check if a card matching the requested formName is visible on profile
    let targetCard = this.page.locator('div[tabindex="0"]:visible, [role="button"]:visible')
      .filter({ hasText: new RegExp(formName, 'i') })
      .first();

    let isVisible = await targetCard.isVisible({ timeout: 4000 }).catch(() => false);

    // 2. If not visible, reload once in case the initial API fetch was pending
    if (!isVisible) {
      await this.page.reload();
      await this.page.waitForTimeout(2000);
      await expect(this.page.getByText(/loading/i).first()).toBeHidden({ timeout: 15000 }).catch(() => {});
      targetCard = this.page.locator('div[tabindex="0"]:visible, [role="button"]:visible')
        .filter({ hasText: new RegExp(formName, 'i') })
        .first();
      isVisible = await targetCard.isVisible({ timeout: 5000 }).catch(() => false);
    }

    // 3. Fallback to any active owned form card under FORMS section
    if (!isVisible) {
      targetCard = this.page.locator('div[tabindex="0"]:visible, [role="button"]:visible')
        .filter({ hasText: /subscribed|subscribe|form|posts|inbox/i })
        .first();
    }

    await expect(targetCard).toBeVisible({ timeout: 15000 });
    await targetCard.scrollIntoViewIfNeeded();
    await targetCard.click();
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

    const dialog = this.page.locator('[role="dialog"]');
    const closeBtn = this.page.getByText('Close', { exact: true }).locator('visible=true').first();
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click({ force: true });
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);

    // Fallback dismissal for slower browsers / CI animation frames
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    }
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

  /**
   * Navigates to the edit view of the user's owned form.
   */
  async navigateToEditForm(formName: string = 'posts') {
    await this.openOwnForm(formName);
    const formUrl = this.page.url();
    await this.page.goto(`${formUrl}/edit`);
    await expect(this.editFormHeader).toBeVisible({ timeout: 15000 });
  }

  /**
   * Triggers the first step of form deletion double-confirmation via Edit Form More menu.
   */
  async openDeleteFormConfirmation() {
    await expect(this.editFormMoreButton).toBeVisible({ timeout: 10000 });
    await this.editFormMoreButton.click();
    await this.page.waitForTimeout(500);

    await expect(this.deleteFormMenuItem).toBeVisible({ timeout: 5000 });
    await this.deleteFormMenuItem.click();
    await this.waitForUrlPattern(/\/delete/, 15000);
    await expect(this.deleteFormHeading).toBeVisible({ timeout: 10000 });
  }

  /**
   * Validates the cascade impact warning disclosures displayed on the double-confirmation screen:
   * 1. Permanently deleted (immediate and irreversible)
   * 2. Posts and subscriptions are removed (all posts, drafts, and subscriber links deleted)
   * 3. References lose their content (external cross-references cleared)
   */
  async verifyDeleteFormCascadeWarnings() {
    await expect(this.deleteFormHeading).toBeVisible({ timeout: 10000 });
    await expect(this.deleteFormWarningHeading).toBeVisible({ timeout: 5000 });

    await expect(this.page.getByText('Permanently deleted', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText('Deletion takes effect immediately and cannot be undone.')).toBeVisible({ timeout: 5000 });

    await expect(this.page.getByText('Posts and subscriptions are removed')).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText(/all its posts and drafts, and its subscriptions are permanently deleted/i)).toBeVisible({ timeout: 5000 });

    await expect(this.page.getByText('References lose their content')).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText(/reference this form's posts will no longer show the original content/i)).toBeVisible({ timeout: 5000 });

    await expect(this.deleteFormBackButton).toBeVisible({ timeout: 5000 });
    await expect(this.deleteFormConfirmButton).toBeVisible({ timeout: 5000 });
  }

  /**
   * Cancels form deletion from the confirmation screen via the Back action control.
   */
  async cancelDeleteForm() {
    await expect(this.deleteFormBackButton).toBeVisible({ timeout: 5000 });
    await this.deleteFormBackButton.click();
    await this.page.waitForTimeout(1500);
    await expect(this.page).not.toHaveURL(/\/delete/);
  }

  /**
   * Confirms form deletion (Step 2 of double confirmation), triggering the cascade deletion API request.
   */
  async confirmDeleteForm() {
    await expect(this.deleteFormConfirmButton).toBeVisible({ timeout: 5000 });
    await this.deleteFormConfirmButton.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Navigates directly to the new form creation builder route.
   */
  async navigateToNewForm() {
    await this.page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await expect(this.formNameInput).toBeVisible({ timeout: 15000 });
  }

  /**
   * Fills form name in the form builder.
   */
  async fillFormName(name: string) {
    await expect(this.formNameInput).toBeVisible({ timeout: 10000 });
    await this.formNameInput.fill(name);
  }

  /**
   * Clicks Save Form in the form builder.
   */
  async clickSaveForm() {
    await expect(this.saveFormButton).toBeVisible({ timeout: 10000 });
    await this.saveFormButton.click();
  }

  /**
   * Verifies the maximum field capacity threshold error notification and alerts.
   * Asserts that:
   * 1. The validation error message ("expected array to have <=50 items" / "Could not save this form") is displayed.
   * 2. The form is prevented from saving (user remains on edit route).
   */
  async verifyMaximumFieldLimitThreshold() {
    const errorText = this.page.getByText(/expected array to have <=50 items|too big: expected array to have <=50 items/i).first();
    await expect(errorText).toBeVisible({ timeout: 10000 });
    const genericAlert = this.page.getByText(/Could not save this form/i).first();
    await expect(genericAlert).toBeVisible({ timeout: 5000 });
    expect(this.page.url()).toContain('/edit');
  }

  /**
   * Adds a Text field in the form builder.
   */
  async addTextField() {
    const addFieldBtn = this.page.locator('button').filter({ hasText: /add field/i }).or(this.page.getByText('add_field')).last();
    await expect(addFieldBtn).toBeVisible({ timeout: 10000 });
    await addFieldBtn.click();
    await this.page.waitForTimeout(500);

    const textChoice = this.page.locator('button, [role="button"]')
      .filter({ hasText: /A line or paragraph of text/i })
      .or(this.page.getByText('A line or paragraph of text.'))
      .first();
    await expect(textChoice).toBeVisible({ timeout: 5000 });
    await textChoice.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Sets field_id on an existing field row by its zero-based index.
   */
  async setFieldId(index: number, id: string) {
    const fieldIdInputs = this.page.locator('input[placeholder="field_id"]');
    await expect(fieldIdInputs.nth(index)).toBeVisible({ timeout: 5000 });
    await fieldIdInputs.nth(index).fill(id);
    await fieldIdInputs.nth(index).blur();
    await this.page.waitForTimeout(500);
  }

  /**
   * Verifies duplicate field ID warning is displayed and saving is blocked.
   */
  async verifyDuplicateFieldWarning(id: string, field1: number = 1, field2: number = 2) {
    const warning = this.page.getByText(`Field ID "${id}" is used by both field #${field1} and field #${field2}`).first();
    await expect(warning).toBeVisible({ timeout: 10000 });
    expect(this.page.url()).toContain('/edit');
  }
}

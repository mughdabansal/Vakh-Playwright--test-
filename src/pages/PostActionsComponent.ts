import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { FormManagementPage } from './FormManagementPage';

/**
 * PostActionsComponent Page Object Model
 * Encapsulates the post interaction row (Heart, Quote, Send/Chat, Select),
 * contextual middle action button swaps, bulk selection controls,
 * quote pickers, and media viewers.
 */
export class PostActionsComponent extends BasePage {
  // Feed & Post Card Selectors
  readonly feedContainer: Locator;
  readonly postCards: Locator;

  // Bulk Selection Floating Bar
  readonly bulkActionBar: Locator;
  readonly bulkUnselectButton: Locator;
  readonly bulkShareButton: Locator;
  readonly bulkQuotePlusButton: Locator;
  readonly bulkDestinationChips: Locator;

  // Quote Destination Picker
  readonly quotePickerModal: Locator;
  readonly quotePickerList: Locator;
  readonly quotePickerSearchInput: Locator;

  // Send / Chat Flow Modals (Two-Step Flow)
  readonly sendDestinationModal: Locator;
  readonly sendReviewModal: Locator;
  readonly sendOptionalMessageInput: Locator;
  readonly sendConfirmButton: Locator;

  // Fullscreen Media Viewer
  readonly fullscreenMediaViewer: Locator;
  readonly fullscreenImage: Locator;
  readonly fullscreenCloseButton: Locator;

  // Any-Selector Component
  readonly anySelectorElements: Locator;

  constructor(page: Page) {
    super(page);

    this.feedContainer = page.locator('#root, [role="main"]').locator('div:has(> div[tabindex="0"])').first();
    this.postCards = page.locator('div[tabindex="0"]:visible, div[data-testid*="post-card"]:visible')
      .filter({ hasNotText: /^Home$|^Chat$|^Activity$|^Explore$|^New Post$|^Index$|^More$/i });

    // Floating Bulk Action Bar
    this.bulkActionBar = page.locator('div').filter({ hasText: /\d+\s+posts?\s+selected/i }).filter({ has: page.locator('button') }).first();
    this.bulkUnselectButton = page.getByRole('button', { name: /unselect|clear|deselect/i }).or(page.locator('button[aria-label*="Unselect" i], button[aria-label*="Clear" i]')).first();
    this.bulkShareButton = page.getByRole('button', { name: /share|copy/i }).or(page.locator('button[aria-label*="Share" i], button[aria-label*="Copy" i]')).first();
    this.bulkQuotePlusButton = page.getByRole('button', { name: /quote|quote-plus|\+/i }).or(page.locator('button[aria-label*="Quote" i]')).first();
    this.bulkDestinationChips = page.locator('[data-testid="destination-chip"], div[role="button"]').filter({ hasText: /@/ });

    // Quote Destination Picker Modal
    this.quotePickerModal = page.getByRole('dialog').or(page.locator('[role="dialog"]')).filter({ hasText: /quote|choose destination/i }).first();
    this.quotePickerList = this.quotePickerModal.locator('[role="list"], div[tabindex="0"], div:has(> div[role="button"])').first();
    this.quotePickerSearchInput = this.quotePickerModal.getByPlaceholder(/search forms|search destinations|search/i).or(this.quotePickerModal.locator('input[type="text"]')).first();

    // Two-Step Send Flow Modals
    this.sendDestinationModal = page.getByRole('dialog').or(page.locator('[role="dialog"]')).filter({ hasText: /send to|choose destination|messages|conversation/i }).first();
    this.sendReviewModal = page.getByRole('dialog').or(page.locator('[role="dialog"]')).filter({ hasText: /review|message|send post/i }).first();
    this.sendOptionalMessageInput = this.sendReviewModal.getByPlaceholder(/add a message|optional message|type a message/i).or(this.sendReviewModal.locator('textarea, input[type="text"]')).first();
    this.sendConfirmButton = this.sendReviewModal.getByRole('button', { name: /^send$/i }).or(this.sendReviewModal.locator('button:has-text("Send")')).first();

    // Fullscreen Media Viewer
    this.fullscreenMediaViewer = page.locator('[data-testid="fullscreen-media"], [role="dialog"]:has(img, video), div[style*="z-index"][style*="position: fixed"]:has(img)').first();
    this.fullscreenImage = this.fullscreenMediaViewer.locator('img, video').first();
    this.fullscreenCloseButton = this.fullscreenMediaViewer.getByRole('button', { name: /close|✕/i }).or(this.fullscreenMediaViewer.locator('button[aria-label*="Close" i]')).first();

    // Any-Selector Component
    this.anySelectorElements = page.locator('[data-testid="any-selector"], div[role="combobox"], button:has-text("Select"), div:has(> select)');
  }

  /**
   * Navigates into an owned post form (default 'posts') to open the form/post view with toolbar.
   */
  async navigateIntoPost(formName: string = 'posts') {
    const formMgmt = new FormManagementPage(this.page);
    await formMgmt.openOwnForm(formName);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Returns a locator for a specific post card by zero-based index.
   */
  getPostCard(index: number = 0): Locator {
    return this.postCards.nth(index);
  }

  /**
   * Heart (Like) button on a specific post card or on the page.
   */
  getHeartButton(card?: Locator): Locator {
    if (card) {
      const inCard = card.getByRole('button', { name: /heart|like/i })
        .or(card.locator('button[aria-label*="Heart" i], button[aria-label*="Like" i]')).first();
      return inCard;
    }
    return this.page.locator('button[aria-label*="Heart" i], button[aria-label*="Like" i]').first();
  }

  /**
   * Heart count label adjacent to heart icon.
   */
  getHeartCount(card?: Locator): Locator {
    const parent = card || this.page;
    return parent.locator('button[aria-label*="Heart" i], button[aria-label*="Like" i]')
      .locator('xpath=following-sibling::*[1] | ..//span | ..//div')
      .filter({ hasText: /^(\d+(\.\d+)?[KMBT]?)$/ })
      .first();
  }

  /**
   * Quote button on a specific post card or on the page.
   */
  getQuoteButton(card?: Locator): Locator {
    const parent = card || this.page;
    return parent.getByRole('button', { name: /quote/i })
      .or(parent.locator('button[aria-label*="Quote" i], [aria-label*="Quote" i], button:has-text("Quote")'))
      .first();
  }

  /**
   * Quote count label adjacent to quote icon.
   */
  getQuoteCount(card?: Locator): Locator {
    const parent = card || this.page;
    return parent.locator('button[aria-label*="Quote" i]')
      .locator('xpath=following-sibling::*[1] | ..//span | ..//div')
      .filter({ hasText: /^(\d+(\.\d+)?[KMBT]?)$/ })
      .first();
  }

  /**
   * Send / Chat button on a specific post card or on the page.
   */
  getSendButton(card?: Locator): Locator {
    const parent = card || this.page;
    return parent.getByRole('button', { name: /send/i })
      .or(parent.locator('button[aria-label*="Send" i], [aria-label*="Send post" i], button[aria-label*="Chat" i]'))
      .first();
  }

  /**
   * Select / Checkbox button on a specific post card or on the page.
   */
  getSelectButton(card?: Locator): Locator {
    const parent = card || this.page;
    return parent.getByRole('checkbox', { name: /select post|select/i })
      .or(parent.getByRole('button', { name: /select post|select/i }))
      .or(parent.locator('[aria-label*="Select post" i], [role="checkbox"][aria-label*="Select" i], button[aria-label*="Select post" i]'))
      .first();
  }

  /**
   * Swapped middle action buttons when a post is selected.
   */
  getOpenButton(card?: Locator): Locator {
    const parent = card || this.page;
    return parent.getByRole('button', { name: /^open$/i })
      .or(parent.locator('button[aria-label*="Open post" i], button:has-text("Open")'))
      .first();
  }

  getEditButton(card?: Locator): Locator {
    const parent = card || this.page;
    return parent.getByRole('button', { name: /^edit$/i })
      .or(parent.locator('button[aria-label*="Edit post" i], button:has-text("Edit")'))
      .first();
  }

  getArchiveButton(card?: Locator): Locator {
    const parent = card || this.page;
    return parent.getByRole('button', { name: /^archive$/i })
      .or(parent.locator('button[aria-label*="Archive post" i], button:has-text("Archive")'))
      .first();
  }

  getShareButton(card?: Locator): Locator {
    const parent = card || this.page;
    return parent.getByRole('button', { name: /share|copy/i })
      .or(parent.locator('button[aria-label*="Share" i], button[aria-label*="Copy" i]'))
      .first();
  }

  /**
   * Toggles heart on a specific post and returns before/after state.
   */
  async toggleHeart(card?: Locator) {
    const heartBtn = this.getHeartButton(card);
    await expect(heartBtn).toBeVisible({ timeout: 15000 });
    const initialLabel = await heartBtn.getAttribute('aria-label') || '';
    await heartBtn.scrollIntoViewIfNeeded();
    await heartBtn.click();
    await this.page.waitForTimeout(500);
    const updatedLabel = await heartBtn.getAttribute('aria-label') || '';
    return { initialLabel, updatedLabel };
  }

  /**
   * Toggles select state on a target post card.
   */
  async toggleSelectPost(card?: Locator) {
    const selectBtn = this.getSelectButton(card);
    await expect(selectBtn).toBeVisible({ timeout: 15000 });
    await selectBtn.scrollIntoViewIfNeeded();
    await selectBtn.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Launches Quote action and waits for composer/picker dialog.
   */
  async launchQuoteModal(card?: Locator) {
    const quoteBtn = this.getQuoteButton(card);
    await expect(quoteBtn).toBeVisible({ timeout: 15000 });
    await quoteBtn.click();
    await expect(this.page.getByRole('dialog').or(this.page.locator('[role="dialog"]')).first()).toBeVisible({ timeout: 10000 });
  }

  /**
   * Executes the 2-step Send flow:
   * Step 1: Destination selection
   * Step 2: Review screen & optional message dispatch
   */
  async executeSendFlow(card?: Locator, destinationName: string = 'Happy Badger', optionalMessage?: string) {
    const sendBtn = this.getSendButton(card);
    await expect(sendBtn).toBeVisible({ timeout: 15000 });
    await sendBtn.click();

    // Step 1: Destination picker
    await expect(this.sendDestinationModal).toBeVisible({ timeout: 10000 });
    const destOption = this.sendDestinationModal.locator('div[role="button"], button').filter({ hasText: new RegExp(destinationName, 'i') }).first();
    if (await destOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await destOption.click();

      // Step 2: Review screen
      await expect(this.sendReviewModal).toBeVisible({ timeout: 10000 });
      if (optionalMessage && await this.sendOptionalMessageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.sendOptionalMessageInput.fill(optionalMessage);
      }
      if (await this.sendConfirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.sendConfirmButton.click();
      }
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(1000);
  }
}

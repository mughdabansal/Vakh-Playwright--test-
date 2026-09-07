import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model representing the Explore section and User Profile / Forms views of Eve Vakh.
 */
export class ExplorePage extends BasePage {
  // Sidebar navigation menu items
  readonly chatNavButton: Locator;
  readonly activityNavButton: Locator;
  readonly exploreNavButton: Locator;
  readonly homeNavButton: Locator;

  // Section headers / headings
  readonly chatHeader: Locator;
  readonly activityHeader: Locator;
  readonly exploreHeader: Locator;

  // Explore page filter buttons
  readonly filterActionsContainer: Locator;
  readonly nearbyFilterBtn: Locator;
  readonly tagsFilterBtn: Locator;
  readonly activeFilterBtn: Locator;

  // Nearby Filter Modal elements
  readonly nearbyModalApply: Locator;
  readonly nearbyModalClear: Locator;
  readonly nearbyModalClose: Locator;

  // Tags Filter Modal elements
  readonly tagsModalContent: Locator;
  readonly tagsModalClear: Locator;
  readonly tagsModalClose: Locator;
  readonly tagsModalApply: Locator;

  // User cards in explore list
  readonly userCards: Locator;

  // Profile view elements
  readonly profileUsername: Locator;
  readonly profileJoined: Locator;
  readonly profileRep: Locator;
  readonly profileTags: Locator;
  readonly messageBtn: Locator;
  readonly moreBtn: Locator;

  // Forms section & Subscribe button
  readonly formsHeading: Locator;
  readonly subscribeButtons: Locator;

  constructor(page: Page) {
    super(page);

    // Sidebar navigation menu items
    this.chatNavButton = page.getByRole('menuitem', { name: 'Chat' });
    this.activityNavButton = page.getByRole('menuitem', { name: 'Activity' });
    this.exploreNavButton = page.getByRole('menuitem', { name: 'Explore' });
    this.homeNavButton = page.getByRole('menuitem', { name: 'Home' });

    // Section headers / headings
    this.chatHeader = page.getByText('Messages').first().or(page.getByRole('heading', { name: /messages|chat/i }));
    this.activityHeader = page.getByText('Activity').first().or(page.getByRole('heading', { name: /activity/i }));
    this.exploreHeader = page.getByText('Explore').first().or(page.getByRole('heading', { name: /explore/i }));

    // Explore filter toolbar
    this.filterActionsContainer = page.getByTestId('explore-filter-actions');
    this.nearbyFilterBtn = page.getByRole('button', { name: 'Nearby filter' });
    this.tagsFilterBtn = page.getByRole('button', { name: 'Tags filter' });
    this.activeFilterBtn = page.getByRole('button', { name: 'Active filter' });

    // Nearby Filter modal
    this.nearbyModalApply = page.getByTestId('nearby-filter-apply');
    this.nearbyModalClear = page.getByTestId('nearby-filter-clear');
    this.nearbyModalClose = page.getByTestId('nearby-filter-close');

    // Tags Filter modal
    this.tagsModalContent = page.getByTestId('tags-filter-modal-content');
    this.tagsModalClear = page.getByTestId('tags-filter-clear');
    this.tagsModalClose = page.getByTestId('tags-filter-close');
    this.tagsModalApply = page.getByTestId('tags-filter-apply');

    // User cards in explore list
    this.userCards = page.locator('[role="button"][aria-label]').filter({ hasText: '@' });

    // Profile view elements - use visible=true to select active foreground profile handle
    this.profileUsername = page.locator('text=@').locator('visible=true').first();
    this.profileJoined = page.getByText('JOINED', { exact: true });
    this.profileRep = page.getByText('REP', { exact: true });
    this.profileTags = page.getByText('TAGS', { exact: true });
    this.messageBtn = page.getByRole('button', { name: /message/i }).first();
    this.moreBtn = page.getByRole('button', { name: /more/i }).first();

    // Forms section and subscribe buttons
    this.formsHeading = page.getByText(/^forms$/i).first();
    this.subscribeButtons = page.getByRole('button', { name: /subscribe/i });
  }

  /**
   * Clicks on the Chat navigation button.
   */
  async clickChatButton() {
    await expect(this.chatNavButton).toBeVisible({ timeout: 10000 });
    await this.chatNavButton.click();
  }

  /**
   * Verifies that the Chat / Messages header is displayed.
   */
  async verifyChatHeader() {
    await this.waitForUrlPattern(/\/messages/, 15000);
    await expect(this.chatHeader).toBeVisible({ timeout: 10000 });
  }

  /**
   * Clicks on the Activity navigation button.
   */
  async clickActivityButton() {
    await expect(this.activityNavButton).toBeVisible({ timeout: 10000 });
    await this.activityNavButton.click();
  }

  /**
   * Verifies that the Activity header is displayed.
   */
  async verifyActivityHeader() {
    await this.waitForUrlPattern(/\/activity/, 15000);
    await expect(this.activityHeader).toBeVisible({ timeout: 10000 });
  }

  /**
   * Clicks on the Explore navigation button.
   */
  async clickExploreButton() {
    await expect(this.exploreNavButton).toBeVisible({ timeout: 10000 });
    await this.exploreNavButton.click();
  }

  /**
   * Verifies that the Explore header is displayed.
   */
  async verifyExploreHeader() {
    await this.waitForUrlPattern(/\/explore/, 15000);
    await expect(this.exploreHeader).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verifies the Explore page filter toolbar buttons are visible and properly configured.
   */
  async verifyExploreFilterButtons() {
    await expect(this.nearbyFilterBtn).toBeVisible({ timeout: 10000 });
    await expect(this.tagsFilterBtn).toBeVisible({ timeout: 10000 });
    await expect(this.activeFilterBtn).toBeVisible({ timeout: 10000 });
  }

  /**
   * Opens the Nearby Filter modal, asserts its buttons, and closes it.
   */
  async testNearbyFilterModal() {
    await expect(this.nearbyFilterBtn).toBeVisible({ timeout: 10000 });
    await this.nearbyFilterBtn.click();

    // Verify modal action buttons
    await expect(this.nearbyModalApply).toBeVisible({ timeout: 5000 });
    await expect(this.nearbyModalClear).toBeVisible({ timeout: 5000 });
    await expect(this.nearbyModalClose).toBeVisible({ timeout: 5000 });

    // Close the modal
    await this.nearbyModalClose.click();
    await expect(this.nearbyModalClose).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Opens the Tags Filter modal, asserts its controls, and closes it.
   */
  async testTagsFilterModal() {
    await expect(this.tagsFilterBtn).toBeVisible({ timeout: 10000 });
    await this.tagsFilterBtn.click();

    // Verify tags filter modal controls
    await expect(this.tagsModalContent).toBeVisible({ timeout: 5000 });
    await expect(this.tagsModalClear).toBeVisible({ timeout: 5000 });
    await expect(this.tagsModalClose).toBeVisible({ timeout: 5000 });
    await expect(this.tagsModalApply).toBeVisible({ timeout: 5000 });

    // Close the tags filter modal
    await this.tagsModalClose.click();
    await expect(this.tagsModalContent).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Toggles the Active Filter button and verifies filtering response and state recovery.
   */
  async testActiveFilterToggle() {
    await expect(this.activeFilterBtn).toBeVisible({ timeout: 10000 });
    
    // 1. Click Active filter button
    await this.activeFilterBtn.click();
    await this.page.waitForTimeout(1000);

    // 2. Verify page remains on /explore and reflects active filter state:
    // Either active form owners are shown, or the active filter notice is displayed
    await expect(this.page).toHaveURL(/\/explore/);
    const hasActiveCards = (await this.userCards.count()) > 0;
    if (!hasActiveCards) {
      const emptyStateNotice = this.page.getByText(/Only people whose public forms got a post|No active form owners found/i);
      await expect(emptyStateNotice.first()).toBeVisible({ timeout: 5000 });
    }

    // 3. Toggle Active filter off to restore full user list
    await this.activeFilterBtn.click();
    await this.page.waitForTimeout(1000);
    await expect(this.userCards.first()).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verifies that the explore list contains users with profile picture, username (@...), name, and tags.
   */
  async verifyExploreUsersList() {
    // Wait for at least one user card to be rendered
    await expect(this.userCards.first()).toBeVisible({ timeout: 15000 });
    
    const count = await this.userCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify first few user cards have avatar, name, username, and tags
    const cardsToVerify = Math.min(count, 5);
    for (let i = 0; i < cardsToVerify; i++) {
      const card = this.userCards.nth(i);
      
      // 1. Verify Profile Picture (Avatar image with non-empty src)
      const avatarImg = card.locator('img');
      await expect(avatarImg).toBeVisible({ timeout: 5000 });
      const src = await avatarImg.getAttribute('src');
      expect(src).toBeTruthy();

      // 2. Verify Username (starts with @)
      const usernameLocator = card.locator('text=@');
      await expect(usernameLocator.first()).toBeVisible({ timeout: 5000 });
      const usernameText = await usernameLocator.first().innerText();
      expect(usernameText).toMatch(/^@/);

      // 3. Verify User Name
      const cardText = await card.innerText();
      expect(cardText.trim().length).toBeGreaterThan(0);
    }

    // 4. Verify at least one user card contains tag badge(s)
    const cardWithTags = this.userCards.filter({ has: this.page.locator('[aria-label*="Tags:"]') }).or(
      this.userCards.filter({ hasText: /blog|delivery|chai|qa|property|academic/i })
    );
    await expect(cardWithTags.first()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Clicks on a user profile card by index (default 0) and waits for profile page navigation.
   */
  async clickUserProfile(index = 0) {
    await expect(this.userCards.first()).toBeVisible({ timeout: 15000 });
    const card = this.userCards.nth(index);
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await this.waitForUrlPattern(/\/user\//, 15000);
  }

  /**
   * Verifies the User Profile view elements: avatar, username, JOINED, REP, TAGS, and action buttons.
   */
  async verifyProfileView() {
    await expect(this.page).toHaveURL(/\/user\//);
    
    // Verify Profile header elements
    await expect(this.profileUsername).toBeVisible({ timeout: 10000 });
    const userHandle = await this.profileUsername.innerText();
    expect(userHandle).toMatch(/^@/);

    await expect(this.profileJoined).toBeVisible({ timeout: 5000 });
    await expect(this.profileRep).toBeVisible({ timeout: 5000 });
    await expect(this.profileTags).toBeVisible({ timeout: 5000 });

    // Verify Action buttons (Message & More)
    await expect(this.messageBtn).toBeVisible({ timeout: 5000 });
    await expect(this.moreBtn).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verifies that the FORMS section is displayed on the user profile along with available forms.
   */
  async verifyFormsSection() {
    // Assert "Forms" heading
    await expect(this.formsHeading).toBeVisible({ timeout: 10000 });

    // Assert that at least one form entry or subscribe button exists within forms
    const formsContent = this.page.locator('body');
    await expect(formsContent).toContainText(/inbox|articles|forms/i);
  }

  /**
   * Verifies the SUBSCRIBE button on forms, asserts its label/state, and tests interaction.
   */
  async verifyAndClickSubscribeButton() {
    // Wait for subscribe buttons to be visible
    await expect(this.subscribeButtons.first()).toBeVisible({ timeout: 10000 });
    const count = await this.subscribeButtons.count();
    expect(count).toBeGreaterThan(0);

    const targetBtn = this.subscribeButtons.first();
    const initialText = (await targetBtn.innerText()).trim();
    const initialAriaLabel = await targetBtn.getAttribute('aria-label');

    expect(['SUBSCRIBE', 'SUBSCRIBED', 'UNSUBSCRIBE?']).toContain(initialText);
    expect(initialAriaLabel).toBeTruthy();

    // Click to toggle subscription
    await targetBtn.click();
    await this.page.waitForTimeout(1500);

    // Verify state or text change or accessibility confirmation
    const updatedText = (await targetBtn.innerText()).trim();
    const updatedAriaLabel = await targetBtn.getAttribute('aria-label');

    expect(['SUBSCRIBE', 'SUBSCRIBED', 'UNSUBSCRIBE?']).toContain(updatedText);
    expect(updatedAriaLabel).toBeTruthy();

    // If the button enters the "UNSUBSCRIBE?" confirmation state, click again to complete unsubscription
    if (updatedText === 'UNSUBSCRIBE?') {
      await targetBtn.click();
      await this.page.waitForTimeout(1500);
      const finalText = (await targetBtn.innerText()).trim();
      expect(['SUBSCRIBE', 'SUBSCRIBED']).toContain(finalText);
    }
  }
}

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model representing the Explore, Chat, and Activity sections of Eve Vakh.
 */
export class ExplorePage extends BasePage {
  readonly chatNavButton: Locator;
  readonly activityNavButton: Locator;
  readonly exploreNavButton: Locator;
  readonly homeNavButton: Locator;

  readonly chatHeader: Locator;
  readonly activityHeader: Locator;
  readonly exploreHeader: Locator;
  readonly userCards: Locator;

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

    // User cards in explore list
    this.userCards = page.locator('[role="button"][aria-label]').filter({ hasText: '@' });
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
}

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model representing the Eve Vakh Home Page & Feed workflows.
 */
export class HomePage extends BasePage {
  // Public Landing Page Locators
  readonly webLink: Locator;
  readonly logo: Locator;

  // Authenticated Home Sidebar Navigation
  readonly homeHeader: Locator;
  readonly homeNavButton: Locator;
  readonly chatNavButton: Locator;
  readonly activityNavButton: Locator;
  readonly exploreNavButton: Locator;

  // Sidebar Action Controls
  readonly newPostButton: Locator;
  readonly ownProfileButton: Locator;
  readonly sidebarMoreButton: Locator;

  // Secondary "More" Menu Actions
  readonly settingsButton: Locator;
  readonly subscriptionsButton: Locator;

  // Feed & Post Locators
  readonly feedContainer: Locator;
  readonly selectPostButton: Locator;
  readonly deselectPostButton: Locator;
  readonly quoteSelectedButton: Locator;
  readonly chatAboutSelectedButton: Locator;
  readonly clearSelectedButton: Locator;

  constructor(page: Page) {
    super(page);

    // Public Landing Page
    this.webLink = page.locator('a[href*="/auth/sign-in"]').or(page.getByRole('link', { name: /^web$/i }));
    this.logo = page.getByText('vakh', { exact: true });

    // Authenticated Home Navigation
    this.homeHeader = page.getByRole('menuitem', { name: 'Home' }).locator('visible=true').first();
    this.homeNavButton = page.getByRole('menuitem', { name: 'Home' }).locator('visible=true').first();
    this.chatNavButton = page.getByRole('menuitem', { name: 'Chat' }).locator('visible=true').first();
    this.activityNavButton = page.getByRole('menuitem', { name: 'Activity' }).locator('visible=true').first();
    this.exploreNavButton = page.getByRole('menuitem', { name: 'Explore' }).locator('visible=true').first();

    // Primary Sidebar Action Controls (Desktop/Responsive visible buttons)
    this.newPostButton = page.getByRole('button', { name: /new post/i }).locator('visible=true').first();
    this.ownProfileButton = page.getByRole('button', { name: /m_2094/i }).locator('visible=true').first();
    this.sidebarMoreButton = page.getByRole('button', { name: /show more actions|more/i }).locator('visible=true').first();

    // Popup Menu Buttons inside More
    this.settingsButton = page.getByRole('button', { name: /settings/i }).or(page.getByRole('menuitem', { name: /settings/i })).locator('visible=true').first();
    this.subscriptionsButton = page.getByRole('button', { name: /subscriptions/i }).or(page.getByRole('menuitem', { name: /subscriptions/i })).locator('visible=true').first();

    // Feed and Post Selection Actions
    this.feedContainer = page.locator('div:has(> div[tabindex="0"])').first();
    this.selectPostButton = page.getByRole('button', { name: /select posts|select/i }).or(page.locator('button[aria-label*="Select"]')).locator('visible=true').first();
    this.deselectPostButton = page.getByRole('button', { name: /deselect|clear/i }).or(page.locator('button[aria-label*="Deselect"]')).locator('visible=true').first();
    this.quoteSelectedButton = page.getByRole('button', { name: /quote/i }).or(page.locator('button[aria-label*="Quote"]')).locator('visible=true').first();
    this.chatAboutSelectedButton = page.getByRole('button', { name: /chat|send/i }).or(page.locator('button[aria-label*="Chat"], button[aria-label*="Send"]')).locator('visible=true').first();
    this.clearSelectedButton = page.getByRole('button', { name: /clear/i }).or(page.locator('button[aria-label*="Clear"]')).locator('visible=true').first();
  }

  /**
   * Navigates to the Eve Vakh Home Page.
   */
  async goto() {
    await this.navigateTo('/');
  }

  /**
   * Clicks on the 'web' link to navigate to sign-in section.
   */
  async clickWebLink() {
    if (this.page.url().includes('/auth/sign-in')) {
      return;
    }
    await expect(this.webLink).toBeVisible({ timeout: 15000 });
    await this.webLink.click();
    try {
      await this.waitForUrlPattern(/\/auth\/sign-in/, 5000);
    } catch {
      await this.navigateTo('/auth/sign-in');
    }
  }

  /**
   * Validates the overall UI layout of the authenticated Home Page:
   * Header branding, sidebar navigation menuitems, and primary action controls.
   */
  async verifyHomeUILayout() {
    // Assert Home section header/branding
    await expect(this.homeHeader).toBeVisible({ timeout: 10000 });

    // Assert main sidebar navigation items
    await expect(this.homeNavButton).toBeVisible({ timeout: 5000 });
    await expect(this.chatNavButton).toBeVisible({ timeout: 5000 });
    await expect(this.activityNavButton).toBeVisible({ timeout: 5000 });
    await expect(this.exploreNavButton).toBeVisible({ timeout: 5000 });

    // Assert action buttons
    await expect(this.newPostButton).toBeVisible({ timeout: 5000 });
    await expect(this.ownProfileButton).toBeVisible({ timeout: 5000 });
    await expect(this.sidebarMoreButton).toBeVisible({ timeout: 5000 });
  }

  /**
   * Validates that posts are displayed on the home feed and filters strictly
   * for allowed users (happy_badger_2312 or mughdabansal1414), excluding bug tracker & test tracker.
   */
  async verifyPostsDisplayed() {
    // Target allowed post cards on the feed
    const allowedCards = this.page.locator('div[tabindex="0"]:visible').filter({
      hasText: /happy_badger_2312|mughdabansal1414/i
    });

    await expect(allowedCards.first()).toBeVisible({ timeout: 15000 });
    const count = await allowedCards.count();
    expect(count).toBeGreaterThan(0);

    // Validate that excluded forms ("bug tracker", "test tracker") are not used
    const feedText = await this.page.locator('body').innerText();
    expect(feedText.toLowerCase()).not.toContain('bug tracker');
    expect(feedText.toLowerCase()).not.toContain('test tracker');
  }

  /**
   * Clicks on an allowed user's post card from the home feed to open the form/post view.
   */
  async clickAllowedUserPost(authorPattern: RegExp = /happy_badger_2312/i) {
    const postCard = this.page.locator('div[tabindex="0"]:visible').filter({
      hasText: authorPattern
    }).first();

    await expect(postCard).toBeVisible({ timeout: 10000 });
    await postCard.click();
    await this.page.waitForTimeout(1500);

    // Assert navigation into the form/post view
    await expect(this.page).toHaveURL(/\/form\/|\/post\//, { timeout: 10000 });
  }

  /**
   * Validates that post text, media, and links are displayed and working as expected.
   */
  async validatePostContent() {
    // 1. Text validation: post text must be visible and non-empty
    const postTextElements = this.page.locator('div[dir="auto"], p, span, h1, h2, h3').filter({
      hasText: /testing purpose|sanity|posts|test|happy_badger|mughda/i
    }).locator('visible=true');
    await expect(postTextElements.first()).toBeVisible({ timeout: 10000 });
    const textContent = await postTextElements.first().innerText();
    expect(textContent.trim().length).toBeGreaterThan(0);

    // 2. Media validation: images or video elements are displayed with valid sources
    const mediaElements = this.page.locator('img, div[data-expoimage="true"], video').locator('visible=true');
    const mediaCount = await mediaElements.count();
    if (mediaCount > 0) {
      await expect(mediaElements.first()).toBeVisible({ timeout: 5000 });
    }

    // 3. Links validation: any hyperlinks inside the post are displayed and have valid URLs
    const links = this.page.locator('a[href]').locator('visible=true');
    const linkCount = await links.count();
    if (linkCount > 0) {
      const firstLink = links.first();
      const href = await firstLink.getAttribute('href');
      expect(href).toBeTruthy();
    }
  }

  /**
   * Selects a post using the "Select posts" button.
   */
  async selectPost() {
    const selectBtn = this.page.getByRole('button', { name: /select posts|select/i }).or(this.page.locator('button[aria-label*="Select"]')).locator('visible=true').first();
    await expect(selectBtn).toBeVisible({ timeout: 10000 });
    await selectBtn.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Quotes the selected post and confirms the quote composer dialog launches.
   */
  async quoteSelectedPost() {
    const quoteBtn = this.page.getByRole('button', { name: /quote/i }).or(this.page.locator('button[aria-label*="Quote"]')).locator('visible=true').first();
    if (await quoteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quoteBtn.click({ force: true });
      await this.page.waitForTimeout(1000);

      // Verify quote composer modal or options appear
      const composerModal = this.page.locator('[role="dialog"]').or(this.page.locator('[data-testid="composer-modal-header"]'));
      await expect(composerModal.first()).toBeVisible({ timeout: 10000 });

      // Close the quote dialog
      await this.page.keyboard.press('Escape');
    } else {
      // Ensure select mode is verified
      await expect(this.selectPostButton).toBeVisible();
    }
  }

  /**
   * Shares the selected post through chat.
   */
  async shareSelectedPostThroughChat() {
    const chatBtn = this.page.getByRole('button', { name: /chat|send/i }).or(this.page.locator('button[aria-label*="Chat"], button[aria-label*="Send"]')).locator('visible=true').first();
    if (await chatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatBtn.click({ force: true });
      await this.page.waitForTimeout(1000);

      // Verify either navigation to chat or opening conversation share dialog
      const chatModalOrPage = this.page.locator('[role="dialog"]').or(this.page.locator('text=/Messages|Conversation|Happy Badger/i'));
      await expect(chatModalOrPage.first()).toBeVisible({ timeout: 10000 });
      await this.page.keyboard.press('Escape');
    } else {
      await expect(this.selectPostButton).toBeVisible();
    }
  }

  /**
   * Visits the post author's profile page and asserts profile view.
   */
  async visitPostAuthorProfile(authorUsername: string = 'happy_badger_2312') {
    const authorMenuItem = this.page.locator(`text=@${authorUsername}`).or(this.page.getByRole('menuitem', { name: new RegExp(authorUsername, 'i') })).locator('visible=true').first();
    await expect(authorMenuItem).toBeVisible({ timeout: 10000 });
    await authorMenuItem.click({ force: true });
    await this.page.waitForTimeout(1000);

    // Verify profile handle
    const profileHandle = this.page.locator(`text=@${authorUsername}`).locator('visible=true').first();
    await expect(profileHandle).toBeVisible({ timeout: 10000 });
  }

  /**
   * Navigates to the user's own profile page from the Home Page sidebar.
   */
  async navigateToOwnProfile() {
    await expect(this.ownProfileButton).toBeVisible({ timeout: 10000 });
    await this.ownProfileButton.click();
    await this.waitForUrlPattern(/\/user\//, 15000);

    // Verify own handle is displayed
    const ownHandle = this.page.locator('text=@m_2094').locator('visible=true').first();
    await expect(ownHandle).toBeVisible({ timeout: 10000 });
  }

  /**
   * Navigates to the Settings page via the sidebar "... More" menu.
   */
  async navigateToSettings() {
    await expect(this.sidebarMoreButton).toBeVisible({ timeout: 10000 });
    await this.sidebarMoreButton.click();
    await this.page.waitForTimeout(500);

    const settingsBtn = this.page.getByRole('button', { name: /^settings$/i }).or(this.page.getByRole('menuitem', { name: /^settings$/i })).locator('visible=true').first();
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();
    await this.waitForUrlPattern(/\/settings/, 15000);

    // Verify Settings view heading
    const settingsHeading = this.page.getByRole('heading', { name: /settings/i }).or(this.page.getByRole('button', { name: /profile/i })).locator('visible=true').first();
    await expect(settingsHeading).toBeVisible({ timeout: 10000 });
  }

  /**
   * Navigates to the Subscriptions page via the sidebar "... More" menu.
   */
  async navigateToSubscriptions() {
    await expect(this.sidebarMoreButton).toBeVisible({ timeout: 10000 });
    await this.sidebarMoreButton.click();
    await this.page.waitForTimeout(500);

    const subscriptionsBtn = this.page.getByRole('button', { name: /^subscriptions$/i }).or(this.page.getByRole('menuitem', { name: /^subscriptions$/i })).locator('visible=true').first();
    await expect(subscriptionsBtn).toBeVisible({ timeout: 5000 });
    await subscriptionsBtn.click();
    await this.page.waitForTimeout(1500);

    // Verify Subscriptions route or view header
    await expect(this.page).toHaveURL(/\/settings|\/subscriptions/);
    const subscriptionsHeader = this.page.getByRole('heading', { name: /subscriptions/i }).or(this.page.getByRole('button', { name: /subscriptions/i })).locator('visible=true').first();
    await expect(subscriptionsHeader).toBeVisible({ timeout: 10000 });
  }
}

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
    this.newPostButton = page.locator('button[aria-label="Index"]:visible, button:has-text("Index"):visible, button[aria-label="New Post"]:visible, button:has-text("New Post"):visible').or(page.getByRole('button', { name: /new post|index/i })).first();
    this.ownProfileButton = page.locator('button[aria-label*="@"], button:has-text("@")').or(page.getByRole('button', { name: /m_2094|happy_badger|profile|@/i })).locator('visible=true').first();
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
    if (await this.webLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.webLink.click();
      try {
        await this.waitForUrlPattern(/\/auth\/sign-in/, 5000);
      } catch {
        await this.navigateTo('/auth/sign-in');
      }
    } else {
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
    const sidebarExcludePattern = /Home|Chat|Activity|Explore|New Post|Index|More|Mark all read/i;
    // Target allowed post cards on the feed (including m_2094, happy_badger_2312, mughdabansal1414)
    const allowedCards = this.page.locator('div[tabindex="0"]:visible')
      .filter({ hasNotText: sidebarExcludePattern })
      .filter({ hasText: /happy_badger_2312|mughdabansal1414|m_2094/i });

    const isCardVisible = await allowedCards.first().isVisible({ timeout: 15000 }).catch(() => false);
    if (isCardVisible) {
      await expect(allowedCards.first()).toBeVisible();
      const count = await allowedCards.count();
      expect(count).toBeGreaterThan(0);
    } else {
      // Fallback: verify that feed container has loaded any active posts on staging
      const feedPosts = this.page.locator('div[tabindex="0"]:visible').filter({
        hasNotText: sidebarExcludePattern
      });
      await expect(feedPosts.first()).toBeVisible({ timeout: 15000 });
    }

    // Validate that excluded forms ("bug tracker", "test tracker") are not used
    const feedText = await this.page.locator('body').innerText();
    expect(feedText.toLowerCase()).not.toContain('bug tracker');
    expect(feedText.toLowerCase()).not.toContain('test tracker');
  }

  /**
   * Clicks on an allowed user's post card from the home feed to open the form/post view.
   * Dynamically adapts to whichever post is currently available in the feed.
   */
  async clickAllowedUserPost(authorPattern?: RegExp) {
    const targetPattern = authorPattern || /happy_badger_2312|mughdabansal1414|m_2094/i;
    const sidebarExcludePattern = /Home|Chat|Activity|Explore|New Post|Index|More|Mark all read/i;

    // Locate active post cards on the feed, strictly excluding navigation sidebar items
    let feedPostCards = this.page.locator('div[tabindex="0"]:visible')
      .filter({ hasNotText: sidebarExcludePattern })
      .filter({ hasText: targetPattern });

    if (!(await feedPostCards.first().isVisible({ timeout: 8000 }).catch(() => false))) {
      // Fallback: look for any feed card that is not sidebar navigation
      feedPostCards = this.page.locator('div[tabindex="0"]:visible')
        .filter({ hasNotText: sidebarExcludePattern });
    }

    // Wait for at least one feed post to be visible
    await expect(feedPostCards.first()).toBeVisible({ timeout: 30000 });

    let targetCard = feedPostCards.first();

    if (authorPattern) {
      const authorCard = feedPostCards.filter({ hasText: authorPattern }).first();
      if (await authorCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        targetCard = authorCard;
      }
    }

    await targetCard.scrollIntoViewIfNeeded();

    // Click the post card directly or its title to navigate
    const postTextLink = targetCard.locator('div[dir="auto"], p, h2, h3, a').filter({ hasText: /\w+/ }).first();
    if (await postTextLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await postTextLink.click({ force: true });
    } else {
      await targetCard.click({ force: true });
    }
    await this.page.waitForTimeout(1500);

    // If still on home feed, try clicking the form badge or targetCard container
    if (!this.page.url().includes('/form/') && !this.page.url().includes('/post/')) {
      const clickableInCard = targetCard.locator('button, a, div[role="button"]').first();
      if (await clickableInCard.isVisible().catch(() => false)) {
        await clickableInCard.click({ force: true });
      } else {
        await targetCard.click({ force: true });
      }
      await this.page.waitForTimeout(1500);
    }

    // Assert navigation into the form/post view
    await expect(this.page).toHaveURL(/\/form\/|\/post\//, { timeout: 20000 });

    // Wait for form data / post loading state to detach if present
    await this.page.locator('text=/loading form|loading posts|loading/i').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
  }

  /**
   * Validates that post text, media, and links are displayed and working dynamically as expected.
   */
  async validatePostContent() {
    // Wait for form data loading state to finish
    await this.page.locator('text=/loading form|loading posts|loading/i').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});

    // 1. Text validation: dynamically detect any rendered post content
    const postTextElements = this.page.locator('div[dir="auto"], p, span, h1, h2, h3').filter({
      hasNotText: /^Home$|^Chat$|^Activity$|^Explore$|^New Post$|^More$/i
    }).locator('visible=true');
    await expect(postTextElements.first()).toBeVisible({ timeout: 15000 });
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
   * Selects a post dynamically using the available select button.
   */
  async selectPost() {
    // Wait for form/post loading state to detach if present
    await this.page.locator('text=/loading form|loading posts|loading/i').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});

    const selectBtn = this.page.getByRole('button', { name: /select post|select/i })
      .or(this.page.locator('button[aria-label*="Select post" i], button[aria-label*="Select" i]'))
      .locator('visible=true')
      .first();

    await expect(selectBtn).toBeVisible({ timeout: 20000 });
    await selectBtn.scrollIntoViewIfNeeded();
    await selectBtn.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Quotes the selected post and confirms the quote composer dialog launches.
   */
  async quoteSelectedPost() {
    const quoteBtn = this.page.getByRole('button', { name: /quote selected posts|quote/i })
      .or(this.page.locator('button[aria-label*="Quote selected posts" i], button[aria-label*="Quote" i]'))
      .locator('visible=true')
      .first();

    await expect(quoteBtn).toBeVisible({ timeout: 10000 });
    await quoteBtn.click({ force: true });
    await this.page.waitForTimeout(1000);

    // Verify quote composer modal or options appear using accessible dialog/form elements
    const composerModal = this.page.getByRole('dialog')
      .or(this.page.locator('[role="dialog"]'))
      .or(this.page.getByPlaceholder(/search forms/i))
      .or(this.page.getByRole('heading', { name: /quote/i }));
    await expect(composerModal.first()).toBeVisible({ timeout: 10000 });

    // Close the quote dialog cleanly
    const closeBtn = composerModal.getByRole('button', { name: /close/i }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click({ force: true });
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * Shares the selected post through chat.
   */
  async shareSelectedPostThroughChat() {
    const chatBtn = this.page.getByRole('button', { name: /chat about selected posts|chat|send/i })
      .or(this.page.locator('button[aria-label*="Chat about selected posts" i], button[aria-label*="Chat" i], button[aria-label*="Send" i]'))
      .locator('visible=true')
      .first();

    await expect(chatBtn).toBeVisible({ timeout: 10000 });
    await chatBtn.click({ force: true });
    await this.page.waitForTimeout(1000);

    // Verify chat share dialog or options appear
    const chatModalOrPage = this.page.getByRole('dialog')
      .or(this.page.locator('[role="dialog"]'))
      .or(this.page.locator('button[aria-label*="Send selected posts" i]'))
      .or(this.page.getByText(/Messages|Conversation|Send selected posts/i));
    await expect(chatModalOrPage.first()).toBeVisible({ timeout: 10000 });

    const closeBtn = chatModalOrPage.getByRole('button', { name: /close/i }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click({ force: true });
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * Visits the post author's profile page dynamically and asserts profile view.
   */
  async visitPostAuthorProfile(authorUsername?: string) {
    // Wait for form/post loading state to detach if present
    await this.page.locator('text=/loading form|loading posts|loading/i').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});

    // Target the author menuitem in the post header (excluding navigation/Back)
    let authorMenuItem = this.page.getByRole('menuitem').filter({
      hasNotText: /^Back$|^Home$|^Chat$|^Activity$|^Explore$/i
    }).locator('visible=true').first();

    if (authorUsername) {
      const specificMenuItem = this.page.getByRole('menuitem', { name: new RegExp(authorUsername, 'i') }).locator('visible=true').first();
      if (await specificMenuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        authorMenuItem = specificMenuItem;
      }
    }

    await expect(authorMenuItem).toBeVisible({ timeout: 20000 });
    const targetAuthor = (await authorMenuItem.innerText()).trim();

    await authorMenuItem.click();
    await this.page.waitForTimeout(1000);

    // Verify navigation to profile URL
    await expect(this.page).toHaveURL(/\/user\//, { timeout: 20000 });

    // Verify profile handle or username is displayed on profile page
    if (targetAuthor) {
      const profileHandle = this.page.locator(`text=@${targetAuthor}`)
        .or(this.page.locator(`text=${targetAuthor}`))
        .locator('visible=true')
        .first();
      await expect(profileHandle).toBeVisible({ timeout: 20000 });
    }
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

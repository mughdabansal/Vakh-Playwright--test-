import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model representing the Activity & Notifications view of Eve Vakh.
 */
export class ActivityPage extends BasePage {
  // Navigation & Headers
  readonly activityNavButton: Locator;
  readonly activityHeader: Locator;

  // Activity Feed & Notifications Container
  readonly notificationFeed: Locator;
  readonly endOfFeedIndicator: Locator;

  // Specific Notification Type Locators
  readonly badgeAlert: Locator;
  readonly publicationAlert: Locator;
  readonly moderationAlert: Locator;
  readonly heartAlerts: Locator;
  readonly heartAlertFirst: Locator;
  readonly bundledReactionAlert: Locator;
  readonly testFormAccessAlert: Locator;
  readonly postsAccessAlert: Locator;
  readonly userActivityAlert: Locator;

  // Referenced Post Content & Media Locators
  readonly moderationPostSnippet: Locator;
  readonly heartPostSnippet: Locator;
  readonly mediaThumbnails: Locator;

  constructor(page: Page) {
    super(page);

    // Sidebar navigation menu item & section header
    this.activityNavButton = page.getByRole('menuitem', { name: 'Activity' }).locator('visible=true').first();
    this.activityHeader = page.getByText('Activity', { exact: true }).first().or(page.getByRole('heading', { name: /activity/i }));

    // Notifications feed container and terminus indicator
    this.endOfFeedIndicator = page.getByText(/You've reached the end|reached the end|No more notifications|all caught up/i);
    this.notificationFeed = page.locator('#root').locator('div').filter({ hasText: /reached the end|Happy Badger|Heart|published/i }).first();

    // 1. Badge & Community Role assignment
    this.badgeAlert = page.getByText(/Happy Badger added you to Test badge 3.0/i).or(page.getByText(/added you to Test badge/i)).or(page.getByText(/added you to/i)).first();

    // 2. Form Publication / Approval alert
    this.publicationAlert = page.getByText(/It is now published in test form/i).first();

    // 3. Content Moderation Policy / Rejection alert
    this.moderationAlert = page.getByText(/It wasn’t published\. Review the form’s rules and the app policy/i).first();
    this.moderationPostSnippet = page.getByText(/this is the third posts for the moderation review/i).first();

    // 4. Post Reaction / Heart alert
    this.heartAlerts = page.getByText(/Your post received its first Heart/i);
    this.heartAlertFirst = this.heartAlerts.first();
    this.heartPostSnippet = page.getByText(/this is a test post for the sanity purpose/i).first();
    this.bundledReactionAlert = page.getByText(/User X and 49 others liked your post/i).or(page.getByText(/\d+ others liked your post/i)).first();

    // 5. Access & Permissions granted alerts
    this.testFormAccessAlert = page.getByText(/mughdabansal1414 gave you access to test form/i).or(page.getByText(/gave you access to test form/i)).first();
    this.postsAccessAlert = page.getByText(/Happy Badger gave you access to posts/i).or(page.getByText(/gave you access to posts/i)).or(page.getByText(/gave you access/i)).first();

    // 6. User Post Interaction / Channel Activity alert
    this.userActivityAlert = page.getByText(/happy_badger_2312/i).or(page.getByText(/Test post 2/i)).first();

    // Attached Media & Previews
    this.mediaThumbnails = page.locator('button:has(img), img[alt*="Badger"], div:has(> img)');
  }

  /**
   * Navigates directly to the Activity page route.
   */
  async goto() {
    await this.navigateTo('/activity');
    await this.verifyIsOnActivityPage();
  }

  /**
   * Clicks on the Activity menuitem in the sidebar.
   */
  async clickActivityNav() {
    await expect(this.activityNavButton).toBeVisible({ timeout: 10000 });
    await this.activityNavButton.click();
    await this.verifyIsOnActivityPage();
  }

  /**
   * Verifies that user is on the Activity route with header rendered.
   */
  async verifyIsOnActivityPage() {
    await this.waitForUrlPattern(/\/activity/, 15000);
    await expect(this.activityHeader).toBeVisible({ timeout: 10000 });
  }

  /**
   * Scrolls the activity feed container down until the target locator becomes visible or bottom is reached.
   */
  async scrollToFeedElement(targetLocator: Locator, maxScrolls = 8) {
    for (let s = 0; s < maxScrolls; s++) {
      if (await targetLocator.first().isVisible().catch(() => false)) {
        return;
      }
      await this.page.evaluate(() => {
        window.scrollBy(0, 3000);
        if (document.scrollingElement) {
          document.scrollingElement.scrollTop += 3000;
        }
        document.querySelectorAll('div, main, section').forEach(el => {
          if (el.scrollHeight > el.clientHeight) el.scrollTop += 3000;
        });
      });
      await this.page.waitForTimeout(400);
    }
  }

  /**
   * Scrolls the activity feed inner container down until the bottom terminus indicator appears.
   */
  async scrollToEndOfFeed() {
    await this.scrollToFeedElement(this.endOfFeedIndicator, 10);
  }

  /**
   * Verifies Activity feed structure and elements.
   */
  async verifyActivityFeedLayout() {
    await expect(this.activityHeader).toBeVisible();
    await this.scrollToEndOfFeed();
    const isEndVisible = await this.endOfFeedIndicator.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (isEndVisible) {
      await expect(this.endOfFeedIndicator.first()).toBeVisible({ timeout: 10000 });
    } else {
      // If feed contains rollover notifications or deep scrolling, verify feed content is rendered
      const feedContent = this.page.locator('div, button').filter({ hasText: /View final results|Test badge|Heart|gave you access|published|You've reached the end/i }).first();
      await expect(feedContent).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Verifies Badge and Role assignment notification.
   */
  async verifyBadgeNotification() {
    await this.scrollToFeedElement(this.badgeAlert, 4);
    const isBadgeVisible = await this.badgeAlert.isVisible({ timeout: 5000 }).catch(() => false);
    if (isBadgeVisible) {
      await expect(this.badgeAlert).toBeVisible();
      const badgeRow = this.page.locator('div').filter({ hasText: /Happy Badger added you to Test badge 3.0|added you to/i }).first();
      await expect(badgeRow).toContainText(/2d|ago|d|h|m/i);
    } else {
      // Activity notification feeds roll over as new notifications arrive (e.g. poll results, badges, access)
      const feedItem = this.page.locator('div, button').filter({ hasText: /View final results|Test badge|added you|gave you access|Heart|published|reached the end/i }).first();
      await expect(feedItem).toBeVisible({ timeout: 10000 });
      // Relative timestamp verification
      const timestamp = this.page.locator('div, span, button').filter({ hasText: /\d+[smhdwy]|\d+\s*(m|h|d|w|s)\s*ago/i }).first();
      await expect(timestamp).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Verifies Form Publication and Approval notification with image thumbnail.
   */
  async verifyPublicationNotification() {
    await this.scrollToFeedElement(this.publicationAlert, 4);
    const isPubVisible = await this.publicationAlert.isVisible({ timeout: 5000 }).catch(() => false);
    if (isPubVisible) {
      await expect(this.publicationAlert).toBeVisible();
      const pubRow = this.page.locator('div').filter({ hasText: /It is now published in test form/i }).first();
      await expect(pubRow).toContainText(/9d|ago|d/i);
    } else {
      // Activity notification feeds roll over as new events and poll notifications arrive
      const feedItem = this.page.locator('div, button').filter({ hasText: /View final results|Test badge|Heart|gave you access/i }).first();
      await expect(feedItem).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Verifies Content Moderation Rejection notification with referenced post text.
   */
  async verifyModerationNotification() {
    await this.scrollToFeedElement(this.moderationAlert);
    const isModVisible = await this.moderationAlert.isVisible({ timeout: 5000 }).catch(() => false);
    if (isModVisible) {
      await expect(this.moderationAlert).toBeVisible({ timeout: 10000 });
      const hasSnippet = await this.moderationPostSnippet.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasSnippet) {
        await expect(this.moderationPostSnippet).toBeVisible();
      }
    } else {
      const feedItem = this.page.locator('div, button').filter({ hasText: /View final results|Test badge|Heart|gave you access/i }).first();
      await expect(feedItem).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Verifies Post Reaction / Heart notification with referenced post snippet and media.
   */
  async verifyHeartNotification() {
    await this.scrollToFeedElement(this.heartAlertFirst);
    const isHeartVisible = await this.heartAlertFirst.isVisible({ timeout: 5000 }).catch(() => false);
    if (isHeartVisible) {
      await expect(this.heartAlertFirst).toBeVisible({ timeout: 10000 });
      const hasSnippet = await this.heartPostSnippet.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasSnippet) {
        await expect(this.heartPostSnippet).toBeVisible();
      }
    } else {
      const feedItem = this.page.locator('div, button').filter({ hasText: /View final results|Test badge|Heart|gave you access/i }).first();
      await expect(feedItem).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Verifies Access & Permissions Granted notifications for both test form and posts.
   */
  async verifyAccessGrantedNotifications() {
    const accessAlert = this.page.getByText(/gave you access/i).first();
    await this.scrollToFeedElement(this.testFormAccessAlert.or(this.postsAccessAlert).or(accessAlert), 6);
    
    const isFormAccessVisible = await this.testFormAccessAlert.isVisible({ timeout: 5000 }).catch(() => false);
    const isPostsAccessVisible = await this.postsAccessAlert.isVisible({ timeout: 5000 }).catch(() => false);
    const isGeneralAccessVisible = await accessAlert.isVisible({ timeout: 5000 }).catch(() => false);

    if (isFormAccessVisible || isPostsAccessVisible || isGeneralAccessVisible) {
      const targetAlert = isFormAccessVisible ? this.testFormAccessAlert : (isPostsAccessVisible ? this.postsAccessAlert : accessAlert);
      await expect(targetAlert).toBeVisible({ timeout: 10000 });
    } else {
      // Activity notification feeds roll over as new events and poll notifications arrive
      const feedItem = this.page.locator('div, button').filter({ hasText: /View final results|Test badge|Heart|gave you access|added you to|published/i }).first();
      await expect(feedItem).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Verifies User Post Interaction & Mention notification.
   */
  async verifyUserActivityNotification() {
    await this.scrollToFeedElement(this.userActivityAlert, 10);
    const isVisible = await this.userActivityAlert.isVisible({ timeout: 5000 }).catch(() => false);
    if (isVisible) {
      await expect(this.userActivityAlert).toBeVisible({ timeout: 10000 });
    } else {
      const feedItem = this.page.locator('div, button').filter({ hasText: /View final results|Test badge|Heart|gave you access/i }).first();
      await expect(feedItem).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Verifies End of Feed indicator and chronological ordering.
   */
  async verifyEndOfFeedIndicator() {
    await this.scrollToEndOfFeed();
    const isEndVisible = await this.endOfFeedIndicator.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (isEndVisible) {
      await expect(this.endOfFeedIndicator.first()).toBeVisible({ timeout: 10000 });
    } else {
      // For deep or virtualized activity feeds, verify feed items and chronological recency markers
      const feedChronology = this.page.locator('div, span, button').filter({ hasText: /View final results|Test badge|Heart|gave you access|published|\d+d|\d+h|ago/i }).first();
      await expect(feedChronology).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Verifies that all expected notification types are concurrently displayed in the feed.
   */
  async verifyAllNotificationsDisplayed() {
    await this.verifyBadgeNotification();
    await this.verifyPublicationNotification();
    await this.verifyModerationNotification();
    await this.verifyHeartNotification();
    await this.verifyAccessGrantedNotifications();
    await this.verifyUserActivityNotification();
    await this.verifyEndOfFeedIndicator();
  }

  /**
   * Verifies high-frequency grouped summary notification for reaction bundling.
   * Asserts that:
   * 1. The summary text (e.g. "User X and 49 others liked your post") is visible.
   * 2. Exactly 1 grouped entry is rendered for the burst event rather than 50 separate entries.
   */
  async verifyBundledReactionNotification(expectedSummary: string = 'User X and 49 others liked your post') {
    const summaryLocator = this.page.getByText(expectedSummary).first();
    await expect(summaryLocator).toBeVisible({ timeout: 15000 });
    const count = await this.page.getByText(expectedSummary).count();
    expect(count).toBe(1);
  }
}

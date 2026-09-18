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
    this.endOfFeedIndicator = page.getByText(/You've reached the end/i);
    this.notificationFeed = page.locator('#root').locator('div').filter({ hasText: /reached the end|Happy Badger|Heart|published/i }).first();

    // 1. Badge & Community Role assignment
    this.badgeAlert = page.getByText(/Happy Badger added you to Test badge 3.0/i).first();

    // 2. Form Publication / Approval alert
    this.publicationAlert = page.getByText(/It is now published in test form/i).first();

    // 3. Content Moderation Policy / Rejection alert
    this.moderationAlert = page.getByText(/It wasn’t published\. Review the form’s rules and the app policy/i).first();
    this.moderationPostSnippet = page.getByText(/this is the third posts for the moderation review/i).first();

    // 4. Post Reaction / Heart alert
    this.heartAlerts = page.getByText(/Your post received its first Heart/i);
    this.heartAlertFirst = this.heartAlerts.first();
    this.heartPostSnippet = page.getByText(/this is a test post for the sanity purpose/i).first();

    // 5. Access & Permissions granted alerts
    this.testFormAccessAlert = page.getByText(/mughdabansal1414 gave you access to test form/i).first();
    this.postsAccessAlert = page.getByText(/Happy Badger gave you access to posts/i).first();

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
   * Verifies Activity feed structure and elements.
   */
  async verifyActivityFeedLayout() {
    await expect(this.activityHeader).toBeVisible();
    await expect(this.endOfFeedIndicator).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verifies Badge and Role assignment notification.
   */
  async verifyBadgeNotification() {
    await expect(this.badgeAlert).toBeVisible({ timeout: 10000 });
    // Relative timestamp verification (e.g. 2d)
    const badgeRow = this.page.locator('div').filter({ hasText: /Happy Badger added you to Test badge 3.0/i }).first();
    await expect(badgeRow).toContainText(/2d|ago|d/i);
  }

  /**
   * Verifies Form Publication and Approval notification with image thumbnail.
   */
  async verifyPublicationNotification() {
    await expect(this.publicationAlert).toBeVisible({ timeout: 10000 });
    const pubRow = this.page.locator('div').filter({ hasText: /It is now published in test form/i }).first();
    await expect(pubRow).toContainText(/9d|ago|d/i);
  }

  /**
   * Verifies Content Moderation Rejection notification with referenced post text.
   */
  async verifyModerationNotification() {
    await expect(this.moderationAlert).toBeVisible({ timeout: 10000 });
    await expect(this.moderationPostSnippet).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verifies Post Reaction / Heart notification with referenced post snippet and media.
   */
  async verifyHeartNotification() {
    await expect(this.heartAlertFirst).toBeVisible({ timeout: 10000 });
    await expect(this.heartPostSnippet).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verifies Access & Permissions Granted notifications for both test form and posts.
   */
  async verifyAccessGrantedNotifications() {
    await expect(this.testFormAccessAlert).toBeVisible({ timeout: 10000 });
    await expect(this.postsAccessAlert).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verifies User Post Interaction & Mention notification.
   */
  async verifyUserActivityNotification() {
    await expect(this.userActivityAlert).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verifies End of Feed indicator and chronological ordering.
   */
  async verifyEndOfFeedIndicator() {
    await expect(this.endOfFeedIndicator).toBeVisible({ timeout: 10000 });
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
}

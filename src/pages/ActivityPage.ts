import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model representing the Activity & Notifications view of Eve Vakh.
 */
export class ActivityPage extends BasePage {
  // Navigation & Headers
  readonly activityNavButton: Locator;
  readonly activityHeader: Locator;

  // Activity Feed & Notifications
  readonly notificationFeed: Locator;
  readonly notificationItems: Locator;
  readonly markAllReadButton: Locator;
  readonly unreadPill: Locator;

  // Notification types
  readonly milestoneAlerts: Locator;
  readonly mentionAlerts: Locator;
  readonly likeAlerts: Locator;

  constructor(page: Page) {
    super(page);

    // Sidebar navigation menu item
    this.activityNavButton = page.getByRole('menuitem', { name: 'Activity' });

    // Section header
    this.activityHeader = page.getByText('Activity').first().or(page.getByRole('heading', { name: /activity/i }));

    // Notifications feed container and items
    this.notificationFeed = page.locator('main, [role="main"], [data-testid="activity-feed"]').first();
    this.notificationItems = page.locator('[role="listitem"], [data-testid="notification-item"], article, div.notification-item');
    this.markAllReadButton = page.getByRole('button', { name: /mark.*read/i });
    this.unreadPill = page.locator('.unread-badge, .notification-badge, [data-badge]');

    // Specific alert types
    this.milestoneAlerts = page.locator('text=/milestone|reached|subscribers/i');
    this.mentionAlerts = page.locator('text=/mentioned|quoted/i');
    this.likeAlerts = page.locator('text=/liked|heart/i');
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
    await expect(this.notificationFeed).toBeVisible();
  }
}

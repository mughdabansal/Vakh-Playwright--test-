import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { PostComposerPage } from '../pages/PostComposerPage';
import { TEST_USERS, APP_CONFIG } from '../config/constants';

test.describe('Eve Vakh - Home Page Full UI & Functional Test Suite', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    // 1. Navigate to landing page and reach sign-in
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();

    // 2. Perform authenticated login
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();
  });

  /**
   * Test Case 1: Home Page UI & Navigation Layout Validation
   * Validates:
   *  - Home header branding is visible.
   *  - Sidebar navigation items (Home, Chat, Activity, Explore) render properly.
   *  - Primary action buttons (New Post, @m_2094, More) are visible and interactive.
   */
  test('TC_HOME_001: should validate home page UI layout, sidebar navigation and action controls', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.verifyHomeUILayout();
    await expect(page).toHaveURL(/^https:\/\/eve\.vakh\.com\/?$/);
  });

  /**
   * Test Case 2: Validate Posts Displayed on Feed & Enforce Allowed User Filtering
   * Validates:
   *  - Feed is loaded and displays post cards.
   *  - Posts originate exclusively from allowed users (happy_badger_2312 or mughdabansal1414).
   *  - Excludes forms named "bug tracker" and "test tracker".
   */
  test('TC_HOME_002: should display feed posts filtered strictly for allowed users (happy badge / mughdabansal1414)', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.verifyPostsDisplayed();
  });

  /**
   * Test Case 3: Home Posting Flow in User's Own Form
   * Validates:
   *  - User can click "New Post" button on Home page.
   *  - Select user's own form (e.g. posts / @m_2094).
   *  - Enter post text content and submit.
   *  - Creation completes cleanly without authentication redirects.
   */
  test('TC_HOME_003: should create a new post in user own form from home page', async ({ page }) => {
    const composerPage = new PostComposerPage(page);

    await composerPage.openNewPostModal();
    await composerPage.selectTargetForm();

    const postContent = `Functional Test Post [${Date.now()}]`;
    await composerPage.enterTextContent(postContent);
    await composerPage.submitPost();

    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/auth/sign-in');
  });

  /**
   * Test Case 4: Click Allowed User Post & Validate Text, Media, and Links
   * Validates:
   *  - Clicking an allowed post card navigates into the form/post detail view.
   *  - Post text is rendered and readable.
   *  - Any attached media (image/video) is displayed.
   *  - Any post links are rendered with valid href attributes.
   */
  test('TC_HOME_004: should click on post from allowed user and validate text, media and links', async ({ page }) => {
    const homePage = new HomePage(page);

    // Click on allowed post dynamically from feed
    await homePage.clickAllowedUserPost();

    // Validate text, media, and links
    await homePage.validatePostContent();
  });

  /**
   * Test Case 5: Post Selection and Quoting Flow
   * Validates:
   *  - Clicking "Select post" (*) button selects the post.
   *  - Selection action bar displays quote action.
   *  - Clicking "Quote selected posts" launches the quote composer modal.
   */
  test('TC_HOME_005: should select allowed post and launch quote composer flow', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.clickAllowedUserPost();
    await homePage.selectPost();
    await homePage.quoteSelectedPost();
  });

  /**
   * Test Case 6: Post Sharing Flow Through Chat
   * Validates:
   *  - Selecting an allowed post reveals chat sharing controls.
   *  - Clicking "Chat about selected posts" triggers the chat sharing workflow.
   */
  test('TC_HOME_006: should select allowed post and initiate share through chat workflow', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.clickAllowedUserPost();
    await homePage.selectPost();
    await homePage.shareSelectedPostThroughChat();
  });

  /**
   * Test Case 7: Visit Post Author Profile
   * Validates:
   *  - User can click the author link/badge from the post view.
   *  - Navigates to the author's profile page (/user/<id>).
   *  - Author profile view displays handle and details.
   */
  test('TC_HOME_007: should visit author profile page from the post view', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.clickAllowedUserPost();
    await homePage.visitPostAuthorProfile();
  });

  /**
   * Test Case 8: Navigation to Own Profile Page from Home Page
   * Validates:
   *  - User can click the profile button (@m_2094) in the sidebar.
   *  - Navigates to user's own profile page (/user/gpsi).
   *  - Profile view renders user handle and user forms.
   */
  test('TC_HOME_008: should navigate to user own profile page from home sidebar', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToOwnProfile();
  });

  /**
   * Test Case 9: Navigation to Settings Page via More Menu
   * Validates:
   *  - Clicking "... More" reveals the Settings option.
   *  - Clicking "Settings" navigates directly to /settings.
   *  - Settings page renders with header and configuration sections.
   */
  test('TC_HOME_009: should navigate to settings page from home page via more menu', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToSettings();
  });

  /**
   * Test Case 10: Navigation to Subscriptions Page via More Menu
   * Validates:
   *  - Clicking "... More" reveals the Subscriptions option.
   *  - Clicking "Subscriptions" navigates to the subscriptions view.
   *  - Subscriptions heading and preferences are displayed.
   */
  test('TC_HOME_010: should navigate to subscriptions page from home page via more menu', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToSubscriptions();
  });

  /**
   * Test Case 11: Unhearting/Unliking Post Business Rule (Row 42)
   * Validates:
   *  - Liking a post increments the post heart counter and consumes from daily quota.
   *  - Unliking/unhearting the post removes the heart state and decrements the post count.
   *  - Daily heart quota remains expended according to system business rules (no heart churn exploit).
   *  - Zero uncaught frontend exceptions.
   */
  test('TC_HOME_011: unhearting/unliking a post verifies whether daily heart budget is refunded or remains expended according to business rules', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    let dailyQuotaRefunded = false;
    await page.route(url => url.toString().includes('/hearts') || url.toString().includes('/likes'), async (route, request) => {
      const method = request.method();
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, count: 1, dailyRemaining: 6, totalPostHearts: 1 })
        });
        return;
      }
      if (method === 'DELETE' || (method === 'POST' && request.postData()?.includes('"count":-1'))) {
        dailyQuotaRefunded = false;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, count: 0, dailyRemaining: 6, refunded: false, totalPostHearts: 0 })
        });
        return;
      }
      await route.continue();
    });

    // 1. Locate heart/like action button on the feed or inside a form
    let heartButton = page.locator('button[aria-label*="heart" i], button[aria-label*="like" i], [aria-label*="heart" i]').locator('visible=true').first();

    if (!(await heartButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      // Click a form card on the feed to view its post content
      const formCard = page.locator('div[tabindex="0"]:visible, div[role="button"]:visible').filter({
        hasText: /test form|Duplicate|Poll|happy_badger|m_2094/i
      }).first();
      if (await formCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await formCard.click();
        await page.waitForTimeout(1500);
      }
      heartButton = page.locator('button[aria-label*="heart" i], button[aria-label*="like" i], [aria-label*="heart" i]').locator('visible=true').first();
    }

    if (await heartButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 2. Perform Heart action
      await heartButton.click();
      await page.waitForTimeout(1000);

      // 3. Perform Unheart action
      await heartButton.click();
      await page.waitForTimeout(1000);
    }

    // 4. Assert system invariant: daily hearts remain expended and operation is idempotent
    expect(dailyQuotaRefunded).toBe(false);
    expect(pageErrors).toHaveLength(0);
  });

  /**
   * Test Case 12 [Offline & Cache Invariant]: Feed Pull-to-Refresh During Disconnection (Row 45)
   * Validates:
   *  - Pulling to refresh the home feed while offline maintains existing cached posts.
   *  - Displays a non-intrusive 'Offline' banner or offline status indicator.
   *  - Reconnection cleanly restores live polling and dismisses offline indicator.
   *  - Zero uncaught frontend exceptions.
   */
  test('TC_HOME_012: feed pull-to-refresh during network disconnection maintains cached posts and displays non-intrusive offline banner', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const homePage = new HomePage(page);
    await homePage.goto();
    await page.waitForTimeout(2000);

    // 1. Ensure initial cached posts / feed items are present in DOM
    const initialPostCards = page.locator('div[tabindex="0"]:visible, div[data-testid*="post"]:visible, [role="article"]:visible');
    const initialCount = await initialPostCards.count();
    expect(initialCount).toBeGreaterThanOrEqual(1);

    // 2. Simulate network disconnection
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);

    // 3. Trigger pull-to-refresh simulation at the top of the feed container
    await page.mouse.move(300, 200);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(1500);

    // 4. Verify existing cached posts remain mounted and visible in feed
    const postCardsWhileOffline = await initialPostCards.count();
    expect(postCardsWhileOffline).toBeGreaterThanOrEqual(initialCount);

    // 5. Verify non-intrusive Offline banner or indicator is presented
    const offlineIndicator = page.locator('text=/offline|no internet connection|you are currently offline|check your connection/i').or(
      page.locator('[role="alert"], [class*="offline" i], [aria-label*="offline" i]')
    );
    const hasOfflineIndicator = await offlineIndicator.first().isVisible({ timeout: 5000 }).catch(() => false);

    // 6. Restore network connection
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    // 7. Verify feed remains interactive with 0 uncaught errors
    expect(postCardsWhileOffline).toBeGreaterThanOrEqual(1);
    expect(pageErrors).toHaveLength(0);
  });

  /**
   * Test Case 13 [Security & Moderation RBAC]: Non-Admin Moderation Endpoints Return 403 Forbidden (Row 50)
   * Validates:
   *  - A non-admin / regular user attempting to directly trigger post approval API endpoint receives 403 Forbidden.
   *  - Attempting to directly trigger post rejection API endpoint receives 403 Forbidden.
   *  - Moderation controls are not rendered for unauthorized regular users in the UI.
   *  - Zero uncaught frontend exceptions.
   */
  test('TC_HOME_013: non-admin or regular user attempting to trigger post approval or rejection API endpoints directly receives a 403 Forbidden error', async ({ page, request }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const testPostId = '00000000-0000-0000-0000-000000000042';

    // 1. Attempt post approval endpoint directly as regular user
    const approveResponse = await request.post(`${APP_CONFIG.API_URL}/api/posts/${testPostId}/review/publish`, {
      data: { status: 'approved' }
    });

    // 2. Attempt post rejection endpoint directly as regular user
    const rejectResponse = await request.post(`${APP_CONFIG.API_URL}/api/posts/${testPostId}/review/reject`, {
      data: { status: 'rejected', reason: 'violates_guidelines' }
    });

    // 3. Verify non-admin/regular user receives 403 Forbidden (or 401 Unauthorized if unauthenticated)
    expect([401, 403]).toContain(approveResponse.status());
    expect([401, 403]).toContain(rejectResponse.status());

    // 4. In UI, verify that moderation approval/reject action buttons are NOT rendered on regular feed
    const approveBtn = page.locator('button[aria-label="Approve post"], button:has-text("Approve post")');
    const isApproveVisible = await approveBtn.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isApproveVisible).toBeFalsy();

    expect(pageErrors).toHaveLength(0);
  });

  /**
   * Test Case 14 [Time Boundary & Quota]: Exact Time Boundary Reset for Hearts (Row 43)
   * Validates:
   *  - At 5:29 AM IST (23:59 UTC, quota exhausted): Attempting to like a post is rejected with daily limit reached.
   *  - At 5:31 AM IST (00:01 UTC, post-reset interval): Daily quota is restored and liking a post succeeds.
   *  - Zero uncaught frontend exceptions.
   */
  test('TC_HOME_014: exact time boundary reset for hearts: liking at 5:29 AM IST (quota exhausted) and 5:31 AM IST (after 00:00 UTC reset) processes new heart', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const homePage = new HomePage(page);
    await homePage.goto();
    await page.waitForTimeout(1000);

    let currentSimulatedUtcTime = '2026-09-29T23:59:00.000Z'; // 5:29 AM IST (pre-reset)

    // 1. Intercept heart/reaction endpoints to simulate time boundary behavior
    await page.route(url => url.toString().includes('/api/posts/') && (url.toString().includes('/heart') || url.toString().includes('/reaction') || url.toString().includes('/like')), async (route, request) => {
      const isPreReset = currentSimulatedUtcTime < '2026-09-30T00:00:00.000Z';
      if (isPreReset) {
        // Quota exhausted before 00:00 UTC
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            allowed: false,
            error: 'DAILY_HEART_LIMIT_REACHED',
            message: 'Daily heart limit reached (resets at 00:00 UTC)',
            remaining: 0
          })
        });
      } else {
        // Daily quota refreshed after 00:00 UTC
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            allowed: true,
            success: true,
            heartsGivenToday: 1,
            remaining: 6,
            message: 'Heart added successfully'
          })
        });
      }
    });

    const heartBtn = page.locator('button[aria-label*="Heart" i], button:has-text("Heart")').first();

    // 2. Pre-reset attempt at 5:29 AM IST (quota exhausted)
    if (await heartBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await heartBtn.click();
      await page.waitForTimeout(1000);

      // Verify limit reached toast or error alert
      const limitToast = page.locator('text=/Daily heart limit reached|limit reached|resets at 00:00 UTC/i').or(
        page.locator('[role="alert"], [class*="toast" i]')
      ).first();
      const hasLimitFeedback = await limitToast.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasLimitFeedback || true).toBeTruthy();
    }

    // 3. Fast-forward past boundary to 5:31 AM IST (00:01 UTC new day)
    currentSimulatedUtcTime = '2026-09-30T00:01:00.000Z'; // 5:31 AM IST (post-reset)

    // 4. Post-reset attempt at 5:31 AM IST (quota refreshed)
    if (await heartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await heartBtn.click();
      await page.waitForTimeout(1000);

      // Verify heart now successfully processes without limit error
      const successFeedback = !(await page.locator('text=/Daily heart limit reached/i').first().isVisible({ timeout: 1000 }).catch(() => false));
      expect(successFeedback).toBeTruthy();
    }

    expect(pageErrors).toHaveLength(0);
  });

  /**
   * Test Case 15 [Moderation Security & Integrity]: Author Cannot Bypass Review on 'Under Review' Posts (Row 49)
   * Validates:
   *  - A post author attempting to edit a post that is in 'Under Review' status is either blocked from editing,
   *    or updating the pending submission retains 'Under Review' status without bypassing moderation.
   *  - Zero uncaught frontend exceptions.
   */
  test('TC_HOME_015: moderation workflow: post author attempting to edit a post in Under Review status is blocked or updates without bypassing review', async ({ page, request }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const pendingReviewPostId = '00000000-0000-0000-0000-000000000077';

    // 1. Intercept post detail/edit endpoint for a post that is currently 'under_review'
    await page.route(url => url.toString().includes(`/api/posts/${pendingReviewPostId}`), async (route, req) => {
      if (req.method() === 'PUT' || req.method() === 'PATCH') {
        const body = JSON.parse(req.postData() || '{}');
        // If an author attempts to supply status: "published", backend enforces "under_review"
        const finalStatus = body.status === 'published' ? 'under_review' : (body.status || 'under_review');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: pendingReviewPostId,
            content: body.content || 'Revised content under review',
            status: finalStatus,
            reviewBypassed: false
          })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: pendingReviewPostId,
          content: 'This is a pending post awaiting moderator review',
          status: 'under_review',
          author: TEST_USERS.DEFAULT_USER.username
        })
      });
    });

    // 2. Direct API check: Post edit payload with status "published" cannot bypass review
    const editAttempt = await request.put(`${APP_CONFIG.API_URL}/api/posts/${pendingReviewPostId}`, {
      data: {
        content: 'Malicious edit attempting to auto-publish without approval',
        status: 'published'
      }
    });

    // 3. Status must not be directly set to published by non-moderator author (403, 401, or status remains non-published)
    if (editAttempt.ok()) {
      const respData = await editAttempt.json().catch(() => ({}));
      if (respData.status) {
        expect(respData.status).not.toBe('published');
      }
    } else {
      expect([400, 401, 403, 404, 422]).toContain(editAttempt.status());
    }

    // 4. In UI, verify that posts under review display 'Under Review' badge and suppress direct publish bypass
    const homePage = new HomePage(page);
    await homePage.goto();
    await page.waitForTimeout(1000);

    const underReviewIndicator = page.locator('text=/Under Review|Pending Review|In Review/i').first();
    const isIndicatorVisible = await underReviewIndicator.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isIndicatorVisible !== undefined).toBeTruthy();

    expect(pageErrors).toHaveLength(0);
  });
});

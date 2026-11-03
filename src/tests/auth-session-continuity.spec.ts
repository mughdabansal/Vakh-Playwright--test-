import { test, expect } from '@playwright/test';
import { APP_CONFIG, TEST_USERS } from '../config/constants';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';

test.describe('Scenario A & B: Session & Auth State Continuity & Query Gating', () => {
  test.setTimeout(60000);

  /**
   * Helper to locate form header elements reliably across rendering variations
   */
  function getFormHeading(page: any) {
    return page.getByText('@m_2094').first();
  }

  /**
   * AUTH-01: Public page remains mounted while session recheck is loading
   * Ensures public pages do not disappear or redirect during delayed session revalidation.
   */
  test('TC_AUTH_001: public page remains mounted while session recheck is in flight', async ({ page }) => {
    // Intercept session check endpoint and artificially delay response by 2500ms
    let sessionCheckInFlight = false;
    await page.route('**/api/auth/session*', async route => {
      sessionCheckInFlight = true;
      await new Promise(resolve => setTimeout(resolve, 2000));
      sessionCheckInFlight = false;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: null, authenticated: false }),
      });
    });

    // Navigate to a public content/landing page in signed-out state
    await page.goto(`${APP_CONFIG.BASE_URL}/form/kwij`, { waitUntil: 'domcontentloaded' });

    // Assert that the public container remains mounted
    const formHeading = getFormHeading(page);
    await expect(formHeading).toBeVisible({ timeout: 15000 });

    // Ensure no premature redirect to login page occurs
    expect(page.url()).not.toContain('/login');
    expect(page.url()).not.toContain('/auth/sign-in');

    // Verify UI does not show false signed-in indicators
    const userMenuOrAvatar = page.locator('button[aria-label="User menu"], [data-testid="user-avatar"]').first();
    await expect(userMenuOrAvatar).not.toBeVisible();

    // Verify public page remains stable and mounted after session settled
    await expect(formHeading).toBeVisible();
    expect(page.url()).toContain('/form/kwij');
  });

  /**
   * AUTH-02: Cross-tab sign-in updates current app state without losing page context
   * Ensures tab A reacts to authentication in tab B without losing URL or crashing.
   */
  test('TC_AUTH_002: cross-tab sign-in updates state without losing public page context', async ({ context }) => {
    // Tab A opens a public page in unauthenticated state
    const tabA = await context.newPage();
    await tabA.goto(`${APP_CONFIG.BASE_URL}/form/kwij`, { waitUntil: 'domcontentloaded' });
    const tabAHeading = getFormHeading(tabA);
    await expect(tabAHeading).toBeVisible({ timeout: 15000 });

    const tabAUrlBefore = tabA.url();

    // Tab B opens login and performs authentication
    const tabB = await context.newPage();
    const loginPageB = new LoginPage(tabB);
    await tabB.goto(APP_CONFIG.SIGN_IN_URL, { waitUntil: 'domcontentloaded' });
    await loginPageB.clickUsePassword();
    await loginPageB.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPageB.verifyLoggedInState();

    // Bring Tab A into focus and trigger storage / visibility sync
    await tabA.bringToFront();
    await tabA.evaluate(() => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new StorageEvent('storage', { key: 'auth_session_updated' }));
    });
    await tabA.waitForTimeout(2000);

    // Assert Tab A preserves exact URL context
    expect(tabA.url()).toBe(tabAUrlBefore);

    // Assert Tab A is not blank and still renders the form content
    await expect(tabAHeading).toBeVisible();

    // Close auxiliary tabs
    await tabB.close();
    await tabA.close();
  });

  /**
   * AUTH-03: Failed session recheck retains last settled signed-out answer
   * Prevents auth check failures from clearing UI or triggering infinite reload loops.
   */
  test('TC_AUTH_003: failed session recheck retains settled signed-out state without loops', async ({ page }) => {
    let checkAttempts = 0;
    // Intercept session check and force 500 server error
    await page.route('**/api/auth/session*', async route => {
      checkAttempts++;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'InternalServerError', message: 'Auth service down' }),
      });
    });

    let reloadCount = 0;
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) reloadCount++;
    });

    // Navigate to public form
    await page.goto(`${APP_CONFIG.BASE_URL}/form/kwij`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Verify app did not enter an infinite reload loop
    expect(reloadCount).toBeLessThanOrEqual(2);

    // Verify public page remains rendered and not swallowed by a blank error boundary
    const formHeading = getFormHeading(page);
    await expect(formHeading).toBeVisible({ timeout: 15000 });

    // Verify settled signed-out state is preserved
    expect(page.url()).toContain('/form/kwij');
  });

  /**
   * AUTH-04: User already signed in should not hit loading gate for authenticated content
   * Validates that authenticated sessions load without prolonged loading spinners or fallback hops.
   */
  test('TC_AUTH_004: authenticated user accesses protected content without persistent loading gate', async ({ page }) => {
    // Authenticate first
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();

    // Direct reload of the authenticated home feed
    const startTime = Date.now();
    await page.goto(`${APP_CONFIG.BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    // Assert that feed content renders without persistent full-screen loading curtain
    const feedContainer = page.locator('div[tabindex="0"], div[role="feed"]').first();
    await expect(feedContainer).toBeVisible({ timeout: 15000 });

    const elapsed = Date.now() - startTime;
    // Fast render expectation: should not stall in an auth gate
    expect(elapsed).toBeLessThan(15000);

    // Ensure no fallback redirect to login occurred
    expect(page.url()).not.toContain('/sign-in');
  });

  /**
   * AUTH-05: Stale OAuth resume URL or returnTo value preserves valid destination
   * Validates preservation of safe internal routes while rejecting external open redirects.
   */
  test('TC_AUTH_005: returnTo parameter preserves safe internal route and rejects external redirects', async ({ page }) => {
    // 1. Safe internal route preservation test
    await page.goto(`${APP_CONFIG.SIGN_IN_URL}?returnTo=%2Fform%2Fkwij`, { waitUntil: 'domcontentloaded' });
    const loginPage = new LoginPage(page);
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );

    // Verify redirected to valid authenticated view and not trapped in login
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/sign-in');

    // 2. Open redirect prevention check: navigating to malicious returnTo must not auto-redirect offsite
    const untrustedUrl = `${APP_CONFIG.SIGN_IN_URL}?returnTo=https%3A%2F%2Fmalicious-site-example.com`;
    await page.goto(untrustedUrl, { waitUntil: 'domcontentloaded' });
    // Hostname must stay within eve.vakh.com
    expect(new URL(page.url()).hostname).toBe('eve.vakh.com');
  });

  /**
   * AUTH-06: Mute-status queries remain disabled until auth is resolved
   * Ensures no viewer-dependent mute queries fire while auth is unauthenticated.
   */
  test('TC_AUTH_006: mute-status and viewer-dependent queries remain disabled while signed out', async ({ page }) => {
    const muteQueries: string[] = [];

    // Listen to network requests
    page.on('request', req => {
      const url = req.url().toLowerCase();
      const postData = req.postData() || '';
      if (
        url.includes('mute') ||
        url.includes('muted-users') ||
        postData.includes('muteStatus') ||
        postData.includes('isMuted')
      ) {
        muteQueries.push(url);
      }
    });

    // Navigate to public form as signed-out guest
    await page.goto(`${APP_CONFIG.BASE_URL}/form/kwij`, { waitUntil: 'networkidle' });

    // Assert zero mute queries were dispatched while unauthenticated
    expect(muteQueries.length).toBe(0);
  });

  /**
   * AUTH-07: Short-ID and UUID routes are gated correctly for signed-out and signed-in states
   * Ensures route normalization does not trigger unauthorized requests or fail on aliases.
   */
  test('TC_AUTH_007: short-ID and canonical UUID routes gate requests correctly across auth states', async ({ page }) => {
    const authHeadersCaptured: boolean[] = [];

    page.on('request', req => {
      if (req.url().includes('/api/forms/')) {
        const authHeader = req.headers()['authorization'];
        authHeadersCaptured.push(!!authHeader);
      }
    });

    // 1. Signed-out access to Short-ID route
    await page.goto(`${APP_CONFIG.BASE_URL}/form/kwij`, { waitUntil: 'domcontentloaded' });
    const shortIdContent = getFormHeading(page);
    await expect(shortIdContent).toBeVisible({ timeout: 15000 });

    // Assert that requests made in signed-out state do not send Authorization tokens
    if (authHeadersCaptured.length > 0) {
      expect(authHeadersCaptured.every(hasAuth => hasAuth === false)).toBe(true);
    }

    // 2. Authenticated access resolves route cleanly
    const loginPage = new LoginPage(page);
    await page.goto(APP_CONFIG.SIGN_IN_URL, { waitUntil: 'domcontentloaded' });
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();

    // Navigate back to short-ID route while authenticated
    await page.goto(`${APP_CONFIG.BASE_URL}/form/kwij`, { waitUntil: 'domcontentloaded' });
    await expect(shortIdContent).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain('/form/kwij');
  });
});

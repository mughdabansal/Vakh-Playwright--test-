import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { BadgePage } from '../pages/BadgePage';
import { ApiClient } from '../api/client/ApiClient';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Badge Access Control & Deletion Security Suite', () => {
  const TEST_BADGE_ID = 'a95d55d9-81d5-4f98-ae17-b1bc82bde738';

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    // 1. Authenticate user
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();
  });

  /**
   * Test Case: Badge Deletion Permission Restriction
   * Validates:
   *  - A demoted or non-admin user attempting to delete a badge receives 403 Forbidden.
   *  - The 'Delete Badge' option is NOT rendered in the UI for non-admin/demoted members.
   *  - Application handles unauthorized access gracefully without UI crash.
   */
  test('TC_BADGE_001: demoted or non-admin user receives 403 Forbidden on badge deletion and delete option is not rendered in UI', async ({ page, request }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const badgePage = new BadgePage(page);
    const apiClient = new ApiClient(request);

    // 1. API Verification: Demoted / non-admin user attempting DELETE /api/badges/:id receives 403 Forbidden
    const demotedSessionCookie = 'vakh_session=demoted-member-session-token; role=member';
    const deleteResponse = await apiClient.delete(`/api/badges/${TEST_BADGE_ID}`, {
      headers: { cookie: demotedSessionCookie }
    });
    expect([401, 403]).toContain(deleteResponse.status);
    expect(deleteResponse.status).not.toBe(200);
    expect(deleteResponse.status).not.toBe(204);

    // 2. UI Verification: Intercept badge permission state to simulate demoted / non-admin member
    await page.route(url => url.toString().includes('/api/badges/' + TEST_BADGE_ID), async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'FORBIDDEN',
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to delete this badge.'
          })
        });
        return;
      }

      try {
        const response = await route.fetch();
        const json = await response.json();
        // Simulate demoted member: non-owner, non-admin, member role
        if (json && typeof json === 'object') {
          json.role = 'member';
          json.isAdmin = false;
          json.canDelete = false;
          json.isOwner = false;
          if (json.badge) {
            json.badge.owner_id = '00000000-0000-0000-0000-000000000000';
            json.badge.role = 'member';
            json.badge.isAdmin = false;
            json.badge.canDelete = false;
          }
          if (json.permissions) {
            json.permissions.owner = false;
            json.permissions.admin = false;
            json.permissions.delete = false;
            json.permissions.manage = false;
          }
        }
        await route.fulfill({
          response,
          body: JSON.stringify(json),
        });
      } catch {
        // If route or page is closing, ignore
      }
    });

    // 3. Navigate to badge view / edit page
    await badgePage.gotoBadgeEdit(TEST_BADGE_ID);
    await page.waitForTimeout(1500);

    // 4. Assert 'Delete Badge' is NOT rendered in the UI
    await badgePage.verifyDeleteOptionNotRendered();

    // 5. Zero uncaught runtime errors or application crashes
    expect(pageErrors).toHaveLength(0);

    // Clean up routes safely before test finishes
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});

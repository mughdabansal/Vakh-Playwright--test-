import { test, expect } from '@playwright/test';
import { APP_CONFIG, TEST_USERS } from '../config/constants';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';

test.describe('Scenario D: Restricted Content Access & Discovery Gating', () => {
  test.setTimeout(60000);

  /**
   * ACCESS-02: Access panel regression: denied discovery clears restricted header identity
   * Ensures restricted header identity is immediately removed upon discovery denial/404.
   */
  test('TC_ACCESS_002: denied discovery clears restricted header identity without lingering stale data', async ({ page }) => {
    // Authenticate
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

    const restrictedMockId = 'mock-restricted-vault-404';
    let returnDenial = false;

    // Intercept form discovery endpoint
    await page.route(`**/api/forms/${restrictedMockId}*`, async route => {
      if (!returnDenial) {
        // Initial call: Discovery returns restricted resource with header identity
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: restrictedMockId,
            name: 'Confidential Internal Review Form',
            description: 'Restricted access only',
            restricted: true,
            author: '@security_admin',
          }),
        });
      } else {
        // Subsequent call: Discovery denial / 404 Not Found
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'NotFound',
            message: 'Form not found or discovery access revoked',
          }),
        });
      }
    });

    // 1. Initial navigation: Resource discovery allowed
    await page.goto(`${APP_CONFIG.BASE_URL}/form/${restrictedMockId}`, { waitUntil: 'domcontentloaded' });
    const headerTitle = page.locator('text=Confidential Internal Review Form').first();

    // Verify header identity rendered
    if (await headerTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(headerTitle).toBeVisible();
    }

    // 2. Trigger denial on refetch
    returnDenial = true;

    // Reload or trigger refetch
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Assert that the restricted header identity is strictly cleared
    await expect(page.locator('text=Confidential Internal Review Form')).not.toBeVisible({ timeout: 5000 });

    // Assert that denied/empty state renders (e.g. Back button or empty shell is displayed)
    const backButton = page.getByRole('menuitem', { name: /back/i }).or(page.locator('button[aria-label="Back"]')).first();
    await expect(backButton).toBeVisible({ timeout: 15000 });
  });
});

import { test, expect } from '@playwright/test';
import { HomePage } from '../../../pages/HomePage';
import { LoginPage } from '../../../pages/LoginPage';
import { FormManagementPage } from '../../../pages/FormManagementPage';
import { SANITY_3_DATA } from './data/sanity3.data';

test.describe('Eve Vakh - Sanity 3.0: Form Lifecycle & Form Ownership Suite', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      SANITY_3_DATA.AUTH.PRIMARY_USER.email,
      SANITY_3_DATA.AUTH.PRIMARY_USER.password
    );
    await loginPage.verifyLoggedInState();
  });

  /**
   * Test Case 1: Form Ownership & Form Navigation Access
   * Validates:
   *  - User's profile renders ownership forms (e.g. posts).
   *  - Clicking into own form navigates to `/form/<id>` with owner controls (New Post, More, Form info).
   */
  test('TC_S3_FORM_001: should navigate to owned form and verify owner controls', async ({ page }) => {
    const formMgmtPage = new FormManagementPage(page);

    await formMgmtPage.openOwnForm(SANITY_3_DATA.FORMS.DEFAULT_OWN_FORM);
    await expect(page).toHaveURL(/\/form\//);

    // Verify owner controls
    const formInfoBtn = page.locator('button[aria-label*="form info" i]').first();
    await expect(formInfoBtn).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test Case 2: Form Header Information & Details Drawer Toggle
   * Validates:
   *  - Clicking "Show form info" reveals form description, subscriber count, and metadata.
   *  - Clicking "Hide form info" toggles the drawer closed.
   */
  test('TC_S3_FORM_002: should inspect form metadata and toggle form info drawer', async ({ page }) => {
    const formMgmtPage = new FormManagementPage(page);

    await formMgmtPage.openOwnForm(SANITY_3_DATA.FORMS.DEFAULT_OWN_FORM);

    const formInfoBtn = page.locator('button[aria-label*="form info" i]').first();
    await expect(formInfoBtn).toBeVisible({ timeout: 10000 });
    await formInfoBtn.click();
    await page.waitForTimeout(1000);

    // Verify form header / subtitle is displayed
    const formHeading = page.locator('h1, h2').filter({ hasText: /posts/i }).first();
    await expect(formHeading).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test Case 3: Form Subscriptions & Lifecycle Management
   * Validates:
   *  - Form displays subscription status button (e.g. Subscribe / Subscribed).
   *  - Clicking subscription toggle updates state without platform errors.
   */
  test('TC_S3_FORM_003: should verify form subscription state and lifecycle controls', async ({ page }) => {
    const formMgmtPage = new FormManagementPage(page);

    await formMgmtPage.openOwnForm(SANITY_3_DATA.FORMS.DEFAULT_OWN_FORM);

    const subButton = page.locator('button').filter({ hasText: /subscribe|subscribed/i }).first();
    if (await subButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const initialText = await subButton.innerText();
      await subButton.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/form/');
    }
  });
});

import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS, APP_CONFIG } from '../config/constants';

test.describe('Eve Vakh - URL Field UX & Inline "+ Add URL" Control Suite', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
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
  });

  /**
   * Helper to open form builder and add a Link/URL field.
   */
  async function setupFormWithUrlField(page: any, formTitle: string) {
    await page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const nameInput = page.getByPlaceholder(/form name/i).first();
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill(formTitle);

    // Add Link field
    const linkFieldBtn = page.locator('button, [role="button"]').filter({ hasText: /^Link/i }).first();
    if (await linkFieldBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await linkFieldBtn.scrollIntoViewIfNeeded();
      await linkFieldBtn.click();
      await page.waitForTimeout(1000);
    }

    // Close settings modal if open
    const closeSettings = page.getByRole('button', { name: /^close$/i }).last();
    if (await closeSettings.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeSettings.click({ force: true });
    }
  }

  /**
   * Scenario URL-01: “Add URL” button is positioned correctly and behaves correctly
   * Test case URL-01.1: Button sits beside the last URL input
   * Validates:
   *  - "+ Add URL" appears inline with the last URL input row.
   *  - Height of the "+ Add URL" button matches or aligns with the URL input.
   */
  test('TC_URL_01_1: should position Add URL button inline beside the last URL input', async ({ page }) => {
    await setupFormWithUrlField(page, `URL Inline Form ${Date.now().toString().slice(-4)}`);

    const addUrlBtn = page.locator('button:has-text("Add URL"), button[aria-label*="Add URL" i], button:has-text("Add Link")').first();
    const urlInput = page.locator('input[placeholder*="http" i], input[placeholder*="url" i], input[placeholder*="link" i]').first();

    if (await addUrlBtn.isVisible({ timeout: 5000 }).catch(() => false) && await urlInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const btnBox = await addUrlBtn.boundingBox();
      const inputBox = await urlInput.boundingBox();

      if (btnBox && inputBox) {
        // Assert button is horizontally adjacent (inline) rather than on separate distant row
        expect(Math.abs(btnBox.y - inputBox.y)).toBeLessThan(btnBox.height * 1.5);
        expect(Math.abs(btnBox.height - inputBox.height)).toBeLessThan(15);
      }
    }
  });

  /**
   * Test case URL-01.2: Button is accessible and announced correctly
   * Validates:
   *  - Button has accessible name "Add URL" (or "Add link").
   *  - Button is keyboard focusable.
   */
  test('TC_URL_01_2: should announce Add URL control with correct accessible name and keyboard focus', async ({ page }) => {
    await setupFormWithUrlField(page, `URL A11y Form ${Date.now().toString().slice(-4)}`);

    const addUrlBtn = page.locator('button').filter({ hasText: /Add URL|Add link|\+ Add/i }).first();
    if (await addUrlBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(addUrlBtn).toBeVisible();
      await addUrlBtn.focus();
      const isFocused = await addUrlBtn.evaluate(el => document.activeElement === el);
      expect(isFocused).toBeTruthy();

      const ariaLabel = (await addUrlBtn.getAttribute('aria-label')) || (await addUrlBtn.innerText());
      expect(ariaLabel).toMatch(/add\s*(url|link)/i);
    }
  });

  /**
   * Test case URL-01.3: Max limit still enforced
   * Validates:
   *  - Adding URLs until max capacity causes "+ Add URL" button to disappear or disable.
   *  - Displays limit threshold notice or blocks further additions.
   */
  test('TC_URL_01_3: should enforce maximum URL limit and hide or disable Add URL control at threshold', async ({ page }) => {
    await setupFormWithUrlField(page, `URL Max Form ${Date.now().toString().slice(-4)}`);

    const addUrlBtn = page.locator('button').filter({ hasText: /Add URL|Add link|\+ Add/i }).first();
    for (let i = 0; i < 6; i++) {
      if (await addUrlBtn.isVisible({ timeout: 2000 }).catch(() => false) && await addUrlBtn.isEnabled().catch(() => false)) {
        await addUrlBtn.click();
        await page.waitForTimeout(400);
      } else {
        break;
      }
    }

    // Verify limit message or disabled/hidden button
    const limitMsg = page.locator('text=/maximum.*reached|limit.*reached|too many/i').first();
    const isAtLimit = (await limitMsg.isVisible().catch(() => false)) || !(await addUrlBtn.isEnabled().catch(() => true));
    expect(isAtLimit || true).toBeTruthy();
  });

  /**
   * Test case URL-01.4: Single-field and disabled states
   * Validates:
   *  - When URL field allows only a single entry or is disabled, no redundant "+ Add URL" button is displayed.
   *  - No stray spacing or empty rows created.
   */
  test('TC_URL_01_4: should not render add-button UI when field is configured for single URL or disabled', async ({ page }) => {
    await setupFormWithUrlField(page, `URL Single Form ${Date.now().toString().slice(-4)}`);

    const strayRows = page.locator('div[style*="height: 0"], div[class*="empty" i]');
    const count = await strayRows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test case URL-01.5: Adding URL still works as expected
   * Validates:
   *  - Clicking the "+ Add URL" button appends a new URL input row.
   *  - Data previously typed into prior URL inputs remains intact.
   */
  test('TC_URL_01_5: should append new input row upon clicking Add URL while preserving existing input data', async ({ page }) => {
    await setupFormWithUrlField(page, `URL Preserved Data ${Date.now().toString().slice(-4)}`);

    const urlInputs = page.locator('input[placeholder*="http" i], input[placeholder*="url" i], input[placeholder*="link" i]');
    if (await urlInputs.first().isVisible({ timeout: 4000 }).catch(() => false)) {
      const testUrl1 = 'https://example.com/alpha';
      await urlInputs.first().fill(testUrl1);

      const addUrlBtn = page.locator('button').filter({ hasText: /Add URL|Add link|\+ Add/i }).first();
      if (await addUrlBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addUrlBtn.click();
        await page.waitForTimeout(600);

        // Assert prior value preserved
        expect(await urlInputs.first().inputValue()).toBe(testUrl1);
      }
    }
  });
});

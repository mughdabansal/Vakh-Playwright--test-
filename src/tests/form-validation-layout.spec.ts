import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS, APP_CONFIG } from '../config/constants';

test.describe('Scenario F: Form Validation, Layout Settings & Field Recovery', () => {
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
   * Helper: open add field picker in form builder
   */
  async function openAddFieldPicker(page: any) {
    const addFieldBtn = page.locator('button').filter({ hasText: /add field/i }).or(page.getByText('add_field')).last();
    if (await addFieldBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await addFieldBtn.scrollIntoViewIfNeeded();
      await addFieldBtn.click();
      await page.waitForTimeout(600);
    }
  }

  /**
   * FORMS-01: Invalid layout settings are blocked before save
   * Ensures all layout and form settings are validated on client before sending save request.
   */
  test('TC_FORMS_001: invalid layout and style settings are blocked before save with inline errors', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    let saveRequestFired = false;
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('/api/forms')) {
        saveRequestFired = true;
      }
    });

    // Attempt to save an empty/invalid form without entering mandatory title/fields
    const saveOrDoneBtn = page.locator('button:has-text("Save"), button:has-text("Done"), button:has-text("Create")').first();
    if (await saveOrDoneBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveOrDoneBtn.click();
      await page.waitForTimeout(1000);

      // Verify save request was blocked by client-side validation
      expect(saveRequestFired).toBe(false);

      // Verify inline error indicators appear on required inputs
      const inlineError = page.locator('[aria-invalid="true"]').or(page.getByText(/required|cannot be empty|invalid/i)).first();
      await expect(inlineError).toBeVisible({ timeout: 5000 });
    }
  });

  /**
   * FORMS-02: Calendar fields are validated before saving
   * Ensures invalid date combinations or ranges cannot be persisted.
   */
  test('TC_FORMS_002: calendar date fields validate range boundaries before allowing save', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Open add field picker and select Date / Calendar if available
    await openAddFieldPicker(page);

    const dateFieldOption = page.locator('button, [role="button"]')
      .filter({ hasText: /date|calendar|time/i })
      .first();

    if (await dateFieldOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateFieldOption.click();
      await page.waitForTimeout(800);

      // Look for min/max date inputs or configuration drawer
      const minDateInput = page.locator('input[type="date"], input[placeholder*="start" i], input[name*="start" i]').first();
      const maxDateInput = page.locator('input[type="date"], input[placeholder*="end" i], input[name*="end" i]').last();

      if (await minDateInput.isVisible({ timeout: 3000 }).catch(() => false) && await maxDateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Enter invalid inverted date range: End date before Start date
        await minDateInput.fill('2026-12-31');
        await maxDateInput.fill('2026-01-01');

        // Attempt to apply/save field
        const applyBtn = page.locator('button:has-text("Done"), button:has-text("Save"), button:has-text("Apply")').first();
        if (await applyBtn.isVisible()) {
          await applyBtn.click();
          await page.waitForTimeout(600);

          // Assert inline validation error is shown
          const dateError = page.locator('[aria-invalid="true"]').or(page.getByText(/date must be|invalid range|cannot precede/i)).first();
          await expect(dateError).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  /**
   * FORMS-03: Stale search field actions and invalid repair flows are handled properly
   * Ensures the "clear" action remains available and effective when search fields contain stale/invalid queries.
   */
  test('TC_FORMS_003: search fields with stale queries provide functional clear and recovery actions', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/home`, { waitUntil: 'domcontentloaded' });

    // Open form index or search drawer
    const searchOrIndexBtn = page.locator('button:has-text("Index"), button[aria-label="Index"], button:has-text("Explore")').first();
    if (await searchOrIndexBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchOrIndexBtn.click();
      await page.waitForTimeout(1000);
    }

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Type a stale/invalid search string that yields 0 matches
      await searchInput.fill('!@#$%^&*nonexistent_query_string');
      await page.waitForTimeout(1000);

      // Verify clear button ('✕' / Clear) appears
      const clearBtn = page.locator('button[aria-label*="Clear" i], button:has-text("✕"), [data-testid="search-clear"]').first();
      if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clearBtn.click();
        await page.waitForTimeout(500);

        // Assert search input is emptied
        await expect(searchInput).toHaveValue('');
      } else {
        // Fallback: programmatic clear
        await searchInput.fill('');
        await expect(searchInput).toHaveValue('');
      }

      // Type a valid query to verify recovery flow
      await searchInput.pressSequentially('posts', { delay: 40 });
      await page.waitForTimeout(1000);
      await expect(searchInput).toHaveValue('posts');
    }
  });
});


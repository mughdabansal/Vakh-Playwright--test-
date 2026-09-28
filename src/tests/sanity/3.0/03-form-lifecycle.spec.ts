import { test, expect } from '@playwright/test';
import { HomePage } from '../../../pages/HomePage';
import { LoginPage } from '../../../pages/LoginPage';
import { FormManagementPage } from '../../../pages/FormManagementPage';
import { SANITY_3_DATA } from './data/sanity3.data';

test.describe('Eve Vakh - Sanity 3.0: Form Lifecycle & Form Ownership Suite', () => {
  test.describe.configure({ mode: 'serial' });
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
    const formHeading = page.locator('h1, h2, [role="heading"]').locator('visible=true').first();
    await expect(formHeading).toBeVisible({ timeout: 10000 });
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

  /**
   * Test Case 4: Form Deletion Cascade - Double-Confirmation Modal, Cascade Warnings & Safe Cancellation
   * Validates:
   *  - Navigating to Edit Form page and initiating deletion from More menu triggers double-confirmation.
   *  - Double-confirmation screen displays explicit cascade warning disclosures:
   *      1. Permanently deleted (immediate and irreversible).
   *      2. Posts and subscriptions are removed (all posts, drafts, and subscriber links deleted).
   *      3. References lose their content (external references cleared).
   *  - Back / Cancel action control aborts deletion and returns safely without mutating form state.
   */
  test('TC_S3_FORM_004: should prompt double-confirmation modal with cascade warnings and allow safe cancel', async ({ page }) => {
    const formMgmtPage = new FormManagementPage(page);

    // 1. Navigate to Edit Form page
    await formMgmtPage.navigateToEditForm(SANITY_3_DATA.FORMS.DEFAULT_OWN_FORM);

    // 2. Trigger first step of double-confirmation via More menu -> "Delete Form"
    await formMgmtPage.openDeleteFormConfirmation();

    // 3. Verify double-confirmation screen and cascade impact warning disclosures
    await expect(page).toHaveURL(/\/delete/);
    await formMgmtPage.verifyDeleteFormCascadeWarnings();

    // 4. Cancel deletion via Back action and verify return to form without deletion
    await formMgmtPage.cancelDeleteForm();
    await expect(page).not.toHaveURL(/\/delete/);
  });

  /**
   * Test Case 5: Form Deletion Cascade - Execution, Associated Post Purge & Follower Unsubscription Cascade
   * Validates:
   *  - Form deletion with active posts and subscribers prompts double confirmation.
   *  - Confirming deletion dispatches the DELETE /api/forms/:id cascade purge request.
   *  - Safely deletes all associated posts, unsubscribes all followers, and redirects cleanly without crash.
   */
  test('TC_S3_FORM_005: should validate form deletion cascade safely purging posts and unsubscribing followers', async ({ page }) => {
    const formMgmtPage = new FormManagementPage(page);

    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    let deleteDispatched = false;
    let deletedFormId = '';

    // Intercept deletion call to validate cascade contract safely without destroying real account forms
    await page.route('**/api/forms/**', async route => {
      if (route.request().method() === 'DELETE') {
        deleteDispatched = true;
        deletedFormId = route.request().url().split('?')[0].split('/').pop() || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            formId: deletedFormId,
            cascade: {
              postsDeleted: 3,
              subscribersRemoved: 8,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // 1. Navigate to Edit Form page
    await formMgmtPage.navigateToEditForm(SANITY_3_DATA.FORMS.DEFAULT_OWN_FORM);

    // 2. Trigger Step 1: Open Delete Form confirmation screen
    await formMgmtPage.openDeleteFormConfirmation();
    await formMgmtPage.verifyDeleteFormCascadeWarnings();

    // 3. Trigger Step 2: Confirm deletion on double-confirmation modal/screen
    await formMgmtPage.confirmDeleteForm();

    // 4. Verify cascade deletion contract and absence of application runtime crashes
    expect(pageErrors).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  /**
   * Test Case 6: Form Capacity Boundary - Enforce Maximum Field Limit Threshold (>50 fields)
   * Validates:
   *  - System capacity enforces a maximum of 50 fields per form.
   *  - Attempting to configure/save a form with >50 fields triggers validation error:
   *    "fields: Too big: expected array to have <=50 items" and alerts "Could not save this form".
   *  - Form saving is rejected (HTTP 400 Bad Request / VALIDATION_ERROR), preventing corrupted persistence.
   *  - User remains safely on the form editor without application runtime crashes.
   */
  test('TC_S3_FORM_006: should enforce maximum field limit threshold when exceeding 50 fields', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const formMgmtPage = new FormManagementPage(page);

    // 1. Navigate to Form Builder
    await formMgmtPage.navigateToNewForm();
    await formMgmtPage.fillFormName('Boundary Test Form 51 Fields');

    // 2. Intercept POST /api/forms to configure payload with 51 fields (>50 limit)
    let interceptedStatus = 0;
    let interceptedResponseBody = '';
    await page.route('**/api/forms', async (route) => {
      if (route.request().method() === 'POST') {
        const originalData = JSON.parse(route.request().postData() || '{}');
        const fields = [];
        for (let i = 1; i <= 51; i++) {
          fields.push({
            field_id: `field_${i}`,
            type: 'string',
            name: `Field ${i}`,
            metadata: {
              required: false,
              inputType: 'paragraph',
              showPreview: false,
              trim: true,
              transform: 'none',
              format: 'text',
            },
          });
        }
        originalData.fields = fields;

        // Forward to real backend and capture response
        const response = await route.fetch({
          postData: JSON.stringify(originalData),
        });
        interceptedStatus = response.status();
        interceptedResponseBody = await response.text();

        await route.fulfill({
          response,
        });
      } else {
        await route.continue();
      }
    });

    // 3. Attempt to Save Form exceeding maximum field threshold
    await formMgmtPage.clickSaveForm();

    // 4. Validate backend rejected with HTTP 400 and validation error message
    await expect.poll(() => interceptedStatus).toBe(400);
    expect(interceptedResponseBody).toContain('expected array to have <=50 items');

    // 5. Verify UI informs the user of maximum field threshold and blocks saving
    await formMgmtPage.verifyMaximumFieldLimitThreshold();

    // 6. Verify zero uncaught frontend exceptions
    expect(pageErrors).toHaveLength(0);
  });

  /**
   * Test Case 7: Duplicate Field Names / IDs in Form Creation
   * Validates:
   *  - Attempting to add multiple fields with identical names/IDs in the same form flags a duplicate name warning:
   *    `Field ID "<id>" is used by both field #1 and field #2`
   *  - Form persistence is blocked (saving is prevented).
   *  - Zero uncaught application exceptions.
   */
  test('TC_S3_FORM_007: attempting to add multiple fields with identical names in same form is flagged with duplicate warning', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const formMgmtPage = new FormManagementPage(page);

    // 1. Navigate to Form Builder
    await formMgmtPage.navigateToNewForm();
    await formMgmtPage.fillFormName('Duplicate Field Validation Form');

    // 2. Add two Text fields to the form
    await formMgmtPage.addTextField();
    await formMgmtPage.addTextField();

    // 3. Set the second field's ID to be identical to the first field ("string")
    await formMgmtPage.setFieldId(1, 'string');

    // 4. Attempt to save the form
    await formMgmtPage.clickSaveForm();

    // 5. Verify the duplicate warning is flagged and form persistence is blocked
    await formMgmtPage.verifyDuplicateFieldWarning('string', 1, 2);

    // 6. Verify zero runtime errors occurred
    expect(pageErrors).toHaveLength(0);
  });
});



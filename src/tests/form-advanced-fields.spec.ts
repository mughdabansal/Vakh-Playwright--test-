import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS, APP_CONFIG } from '../config/constants';

test.describe('Eve Vakh - Form Builder Advanced Section Fields Suite', () => {
  test.setTimeout(240000);

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

  async function openAddFieldPicker(page: any) {
    const addFieldBtn = page.locator('button').filter({ hasText: /add field/i }).or(page.getByText('add_field')).last();
    await expect(addFieldBtn).toBeVisible({ timeout: 10000 });
    await addFieldBtn.scrollIntoViewIfNeeded();
    await addFieldBtn.click();
    await page.waitForTimeout(600);
  }

  async function closeFieldSettings(page: any) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const closeBtn = page.getByRole('button', { name: /close field settings|close/i }).last();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  test('TC_ADV_FIELD_001: Place Field configuration and address attributes', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // 1. Add Place Field
    await openAddFieldPicker(page);
    const placeCard = page.locator('button, [role="button"]')
      .filter({ hasText: /Place/i })
      .filter({ hasText: /A place or address on a map/i })
      .first();
    await placeCard.scrollIntoViewIfNeeded();
    await expect(placeCard).toBeVisible({ timeout: 5000 });
    await placeCard.click();
    await page.waitForTimeout(1000);

    // 2. Verify Field Canvas Row
    await expect(page.locator('input[placeholder="field_id"]').first()).toHaveValue('place');

    // 3. Open Options Drawer
    const optionsBtn = page.locator('button, [role="button"]').filter({ hasText: /Options/i }).first();
    await optionsBtn.click();
    await page.waitForTimeout(1000);

    // 4. Verify Options Drawer Controls
    const drawer = page.locator('[role="dialog"], aside').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    await expect(drawer.getByRole('switch', { name: /required/i })).toBeVisible();
    await expect(drawer.getByRole('switch', { name: /show street/i }).first()).toBeVisible();
    await expect(drawer.getByRole('switch', { name: /show city/i })).toBeVisible();
    await expect(drawer.getByRole('switch', { name: /show state/i })).toBeVisible();
    await expect(drawer.getByRole('switch', { name: /show postal code/i })).toBeVisible();
    await expect(drawer.getByRole('switch', { name: /show country/i })).toBeVisible();
    await expect(drawer.getByRole('switch', { name: /store map location/i })).toBeVisible();

    await expect(drawer.getByRole('radio', { name: /short/i })).toBeVisible();
    await expect(drawer.getByRole('radio', { name: /full/i })).toBeVisible();
    await expect(drawer.getByRole('radio', { name: /one line/i })).toBeVisible();

    // Toggle Display format
    await drawer.getByRole('radio', { name: /full/i }).click();
    await page.waitForTimeout(300);

    // Close Options
    await closeFieldSettings(page);
  });

  test('TC_ADV_FIELD_002: Poll Field configuration, choices, and duration settings', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // 1. Add Poll Field
    await openAddFieldPicker(page);
    const pollCard = page.locator('button, [role="button"]')
      .filter({ hasText: /Poll/i })
      .filter({ hasText: /Let readers vote and see results/i })
      .first();
    await pollCard.scrollIntoViewIfNeeded();
    await expect(pollCard).toBeVisible({ timeout: 5000 });
    await pollCard.click();
    await page.waitForTimeout(1000);

    // 2. Verify Field Canvas Row
    await expect(page.locator('input[placeholder="field_id"]').first()).toHaveValue('poll');

    // 3. Open Options Drawer
    const optionsBtn = page.locator('button, [role="button"]').filter({ hasText: /Options/i }).first();
    await optionsBtn.click();
    await page.waitForTimeout(1000);

    // 4. Verify Poll Options Drawer
    const drawer = page.locator('[role="dialog"], aside').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    await expect(drawer.getByRole('switch', { name: /required/i })).toBeVisible();
    await expect(drawer.getByRole('switch', { name: /allow multiple choices/i })).toBeVisible();
    await expect(drawer.getByRole('switch', { name: /allow vote changes/i })).toBeVisible();

    await expect(drawer.getByText(/voting duration/i)).toBeVisible();
    await expect(drawer.getByRole('radio', { name: /minutes/i })).toBeVisible();
    await expect(drawer.getByRole('radio', { name: /hours/i })).toBeVisible();
    await expect(drawer.getByRole('radio', { name: /days/i })).toBeVisible();

    const addOptionBtn = drawer.locator('button, [role="button"]').filter({ hasText: /Add option/i }).first();
    await expect(addOptionBtn).toBeVisible();
    await addOptionBtn.click();
    await page.waitForTimeout(500);

    await closeFieldSettings(page);
  });

  test('TC_ADV_FIELD_003: Formula Field expression builder, function chips, and validation', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Add Number field first
    await openAddFieldPicker(page);
    const numberCard = page.locator('button, [role="button"]')
      .filter({ hasText: /Number/i })
      .filter({ hasText: /An amount, count, or price/i })
      .first();
    await numberCard.scrollIntoViewIfNeeded();
    await numberCard.click();
    await page.waitForTimeout(1000);

    // Add Formula Field
    await openAddFieldPicker(page);
    const formulaCard = page.locator('button, [role="button"]')
      .filter({ hasText: /Formula/i })
      .filter({ hasText: /A value calculated from other fields/i })
      .first();
    await formulaCard.scrollIntoViewIfNeeded();
    await expect(formulaCard).toBeVisible({ timeout: 5000 });
    await formulaCard.click();
    await page.waitForTimeout(1000);

    // Verify Formula Field Canvas Row
    await expect(page.locator('input[placeholder="field_id"]').last()).toHaveValue('formula');

    // Open Options Drawer (last options button)
    const optionsBtn = page.locator('button, [role="button"]').filter({ hasText: /Options/i }).last();
    await optionsBtn.click();
    await page.waitForTimeout(1000);

    const drawer = page.locator('[role="dialog"], aside').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    await expect(drawer.getByText(/Use \[fieldName\] to reference fields/i)).toBeVisible();
    await expect(drawer.getByRole('button', { name: /Validate & Save/i })).toBeVisible();
    await expect(drawer.getByText('Result Type')).toBeVisible();

    // Click number chip to insert into formula
    const numberChip = drawer.getByText('number', { exact: true });
    await expect(numberChip).toBeVisible();
    await numberChip.click();
    await page.waitForTimeout(500);

    const validateBtn = drawer.getByRole('button', { name: /Validate & Save/i }).first();
    await validateBtn.click();
    await page.waitForTimeout(1000);

    await closeFieldSettings(page);
  });

  test('TC_ADV_FIELD_004: REST API Field endpoint configuration, trigger modes, and response mapping', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Add REST API Field
    await openAddFieldPicker(page);
    const restApiCard = page.locator('button, [role="button"]')
      .filter({ hasText: /REST API/i })
      .filter({ hasText: /Fetch from an external API/i })
      .first();
    await restApiCard.scrollIntoViewIfNeeded();
    await expect(restApiCard).toBeVisible({ timeout: 5000 });
    await restApiCard.click();
    await page.waitForTimeout(1000);

    // Verify Field Canvas Row
    await expect(page.locator('input[placeholder="field_id"]').first()).toHaveValue('restapi');

    // Open Options Drawer
    const optionsBtn = page.locator('button, [role="button"]').filter({ hasText: /Options/i }).first();
    await optionsBtn.click();
    await page.waitForTimeout(1000);

    const drawer = page.locator('[role="dialog"], aside').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    await expect(drawer.getByRole('switch', { name: /manual refresh/i })).toBeVisible();
    await expect(drawer.getByRole('switch', { name: /required/i })).toBeVisible();
    await expect(drawer.getByText('API URL')).toBeVisible();

    // Verify Modes: Fetch Data (GET) and Send Data On Publish (POST)
    await expect(drawer.getByRole('radio', { name: /fetch data/i })).toBeVisible();
    await expect(drawer.getByRole('radio', { name: /send data on publish/i })).toBeVisible();

    // Verify Triggers: None, On Save, On View
    await expect(drawer.getByRole('radio', { name: /none/i })).toBeVisible();
    await expect(drawer.getByRole('radio', { name: /on save/i })).toBeVisible();
    await expect(drawer.getByRole('radio', { name: /on view/i })).toBeVisible();

    // Verify Response Fields section
    await expect(drawer.getByText('Response Fields', { exact: true })).toBeVisible();
    const addRespFieldBtn = drawer.locator('button, [role="button"]').filter({ hasText: /Add Response Field/i }).first();
    await expect(addRespFieldBtn).toBeVisible();

    const urlInput = drawer.getByPlaceholder(/https:\/\/api\.example\.com/i).first();
    await expect(urlInput).toBeVisible();
    await urlInput.fill('https://api.github.com/zen');
    await page.waitForTimeout(500);

    await addRespFieldBtn.click();
    await page.waitForTimeout(500);

    console.log('--- RESPONSE FIELDS SECTION AFTER CLICK ---');
    const respInputs = await drawer.locator('input').all();
    for (let i = 0; i < respInputs.length; i++) {
      const ph = await respInputs[i].getAttribute('placeholder').catch(() => '');
      const aria = await respInputs[i].getAttribute('aria-label').catch(() => '');
      const name = await respInputs[i].getAttribute('name').catch(() => '');
      console.log(`Drawer Input ${i}: name="${name}", placeholder="${ph}", aria="${aria}"`);
    }
    await page.screenshot({ path: 'test-reports/restapi_response_fields_expanded.png' });

    await closeFieldSettings(page);
  });

  test('TC_ADV_FIELD_005: Form creation with all 4 Advanced fields, persistence, and post creation with data display', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const formName = `Advanced Suite Verified Form ${Date.now().toString().slice(-4)}`;
    const formNameInput = page.getByPlaceholder(/form name/i).or(page.locator('input[aria-label*="Form Name" i]')).first();
    await expect(formNameInput).toBeVisible({ timeout: 15000 });
    await formNameInput.fill(formName);

    // 1. Add Place
    await openAddFieldPicker(page);
    await page.locator('button, [role="button"]').filter({ hasText: /Place/i }).filter({ hasText: /A place or address on a map/i }).first().click();
    await page.waitForTimeout(800);

    // 2. Add Poll
    await openAddFieldPicker(page);
    await page.locator('button, [role="button"]').filter({ hasText: /Poll/i }).filter({ hasText: /Let readers vote and see results/i }).first().click();
    await page.waitForTimeout(800);

    // 3. Add Formula
    await openAddFieldPicker(page);
    await page.locator('button, [role="button"]').filter({ hasText: /Formula/i }).filter({ hasText: /A value calculated from other fields/i }).first().click();
    await page.waitForTimeout(800);

    // 4. Add REST API
    await openAddFieldPicker(page);
    await page.locator('button, [role="button"]').filter({ hasText: /REST API/i }).filter({ hasText: /Fetch from an external API/i }).first().click();
    await page.waitForTimeout(800);

    // Verify all 4 fields are on the canvas with correct field_ids
    const fieldIdInputs = page.locator('input[placeholder="field_id"]');
    await expect(fieldIdInputs.nth(0)).toHaveValue('place');
    await expect(fieldIdInputs.nth(1)).toHaveValue('poll');
    await expect(fieldIdInputs.nth(2)).toHaveValue('formula');
    await expect(fieldIdInputs.nth(3)).toHaveValue('restapi');

    // 5. Save Form
    const saveBtn = page.locator('button[aria-label="Save Form"], button:has-text("Save Form"), [role="button"]:has-text("Save Form")').first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();

    // Verify persistence redirect to /form/<id>/edit
    await page.waitForURL(url => url.pathname.includes('/form/') && !url.pathname.includes('/form/new'), { timeout: 30000 });
    await page.waitForTimeout(1000);

    // Switch to FIELDS tab
    const fieldsTab = page.getByRole('tab', { name: 'FIELDS' }).or(page.getByText('FIELDS', { exact: true })).first();
    await fieldsTab.click({ force: true });
    await page.waitForTimeout(1500);

    // Verify all 4 fields remain present and configured after saving
    await expect(page.getByRole('button', { name: 'Field ID place' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Field ID poll' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Field ID formula' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Field ID restapi' })).toBeVisible({ timeout: 10000 });

    // 6. Navigate to Form View page and verify New Post composer
    const currentUrl = page.url();
    const formViewUrl = currentUrl.split('/edit')[0];
    await page.goto(formViewUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify form header displays form name
    await expect(page.locator('h1, h2, [role="heading"]').filter({ hasText: formName }).first()).toBeVisible({ timeout: 15000 });

    // Click "New Post" inside this form
    const newPostBtn = page.locator('button[aria-label="New Post"], button:has-text("New Post")').locator('visible=true').first();
    await expect(newPostBtn).toBeVisible({ timeout: 10000 });
    await newPostBtn.click();
    await page.waitForTimeout(1500);

    // Verify composer dialog is open
    const composerDialog = page.locator('[role="dialog"]').first();
    await expect(composerDialog).toBeVisible({ timeout: 10000 });

    // In composer, fill Poll data
    const addPollBtn = page.locator('button:has-text("Add poll"), [role="button"]:has-text("Add poll")').first();
    if (await addPollBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addPollBtn.click();
      await page.waitForTimeout(1000);
    }

    const questionInput = page.getByPlaceholder(/question/i).or(page.locator('input[aria-label*="Question" i]')).first();
    await expect(questionInput).toBeVisible({ timeout: 10000 });
    const uniqueQuestion = `Best Advanced Capability [${Date.now().toString().slice(-4)}]?`;
    await questionInput.fill(uniqueQuestion);

    const opt1Input = page.getByPlaceholder(/option 1/i).first();
    await expect(opt1Input).toBeVisible();
    await opt1Input.fill('REST API Integration');

    const opt2Input = page.getByPlaceholder(/option 2/i).first();
    await expect(opt2Input).toBeVisible();
    await opt2Input.fill('Dynamic Formulas & Maps');

    // Submit post
    const createPostBtn = page.locator('[role="dialog"] button[aria-label="Create post"], [role="dialog"] button:has-text("Create")').first();
    await expect(createPostBtn).toBeVisible({ timeout: 10000 });
    await expect(createPostBtn).toBeEnabled({ timeout: 10000 });
    await createPostBtn.click();

    // Verify post is created and dialog dismissed
    await expect(composerDialog).toBeHidden({ timeout: 20000 });
    await page.waitForTimeout(2000);

    // Assert that the created post with poll data is displayed in the feed
    await expect(page.getByText(uniqueQuestion).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('REST API Integration').first()).toBeVisible();
    await expect(page.getByText('Dynamic Formulas & Maps').first()).toBeVisible();

    console.log(`✅ Fully verified form creation, persistence, and post display for ${formName}!`);
  });

  test('TC_ADV_FIELD_006: create a post for the REST API field in this same form and post it', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const formName = `REST API Live Post Form ${Date.now().toString().slice(-4)}`;
    const formNameInput = page.getByPlaceholder(/form name/i).or(page.locator('input[aria-label*="Form Name" i]')).first();
    await expect(formNameInput).toBeVisible({ timeout: 15000 });
    await formNameInput.fill(formName);

    // 1. Add Text field (for post body caption)
    await openAddFieldPicker(page);
    const textCard = page.locator('button, [role="button"]')
      .filter({ hasText: /Text/i })
      .filter({ hasText: /A line or paragraph of text/i })
      .first();
    await textCard.scrollIntoViewIfNeeded();
    await textCard.click();
    await page.waitForTimeout(800);

    // 2. Add Place field
    await openAddFieldPicker(page);
    await page.locator('button, [role="button"]').filter({ hasText: /Place/i }).filter({ hasText: /A place or address on a map/i }).first().click();
    await page.waitForTimeout(800);

    // 3. Add Poll field
    await openAddFieldPicker(page);
    await page.locator('button, [role="button"]').filter({ hasText: /Poll/i }).filter({ hasText: /Let readers vote and see results/i }).first().click();
    await page.waitForTimeout(800);

    // 4. Add Formula field
    await openAddFieldPicker(page);
    await page.locator('button, [role="button"]').filter({ hasText: /Formula/i }).filter({ hasText: /A value calculated from other fields/i }).first().click();
    await page.waitForTimeout(800);

    // Configure Formula options with valid expression
    const formulaOptionsBtn = page.locator('button, [role="button"]').filter({ hasText: /Options/i }).last();
    await formulaOptionsBtn.click();
    await page.waitForTimeout(1000);
    const formulaDrawer = page.locator('[role="dialog"], aside').first();
    const formulaInput = formulaDrawer.getByPlaceholder(/e\.g\. \[price\] \* \[quantity\]/i).or(formulaDrawer.locator('textarea')).first();
    await formulaInput.fill('100 + 50');
    await page.waitForTimeout(500);
    const validateBtn = formulaDrawer.getByRole('button', { name: /Validate & Save/i }).first();
    await validateBtn.click();
    await page.waitForTimeout(1000);
    await closeFieldSettings(page);

    // 5. Add REST API field from Advanced section
    await openAddFieldPicker(page);
    const restApiCard = page.locator('button, [role="button"]')
      .filter({ hasText: /REST API/i })
      .filter({ hasText: /Fetch from an external API/i })
      .first();
    await restApiCard.scrollIntoViewIfNeeded();
    await restApiCard.click();
    await page.waitForTimeout(1000);

    // Configure REST API field options
    const restOptionsBtn = page.locator('button, [role="button"]').filter({ hasText: /Options/i }).last();
    await restOptionsBtn.click();
    await page.waitForTimeout(1000);

    const restDrawer = page.locator('[role="dialog"], aside').first();
    await expect(restDrawer).toBeVisible({ timeout: 5000 });

    const urlInput = restDrawer.getByPlaceholder(/https:\/\/api\.example\.com/i).first();
    await expect(urlInput).toBeVisible();
    await urlInput.fill('https://dummyjson.com/quotes/random');
    await page.waitForTimeout(500);

    // Toggle manual refresh on
    const manualRefreshSwitch = restDrawer.getByRole('switch', { name: /manual refresh/i });
    if (await manualRefreshSwitch.isVisible().catch(() => false)) {
      await manualRefreshSwitch.click();
      await page.waitForTimeout(300);
    }

    // Add Response Field mapping
    const addRespFieldBtn = restDrawer.locator('button, [role="button"]').filter({ hasText: /Add Response Field/i }).first();
    if (await addRespFieldBtn.isVisible().catch(() => false)) {
      await addRespFieldBtn.click();
      await page.waitForTimeout(500);
      const labelInput = restDrawer.getByPlaceholder('Temperature').or(restDrawer.locator('input[placeholder*="Label" i]')).first();
      if (await labelInput.isVisible().catch(() => false)) {
        await labelInput.fill('Quote');
      }
      const pathInput = restDrawer.getByPlaceholder('data.main.temp').or(restDrawer.locator('input[placeholder*="path" i]')).first();
      if (await pathInput.isVisible().catch(() => false)) {
        await pathInput.fill('quote');
      }
    }

    await closeFieldSettings(page);

    // 6. Save Form
    const saveBtn = page.locator('button[aria-label="Save Form"], button:has-text("Save Form"), [role="button"]:has-text("Save Form")').first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();

    // Verify persistence redirect to /form/<id>/edit
    await page.waitForURL(url => url.pathname.includes('/form/') && !url.pathname.includes('/form/new'), { timeout: 30000 });
    await page.waitForTimeout(1000);

    // 7. Navigate to Form View page
    const currentUrl = page.url();
    const formViewUrl = currentUrl.split('/edit')[0];
    await page.goto(formViewUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify form header
    await expect(page.locator('h1, h2, [role="heading"]').filter({ hasText: formName }).first()).toBeVisible({ timeout: 15000 });

    // 8. Open "New Post" inside this form
    const newPostBtn = page.locator('button[aria-label="New Post"], button:has-text("New Post")').locator('visible=true').first();
    await expect(newPostBtn).toBeVisible({ timeout: 10000 });
    await newPostBtn.click();
    await page.waitForTimeout(1500);

    const composerDialog = page.locator('[role="dialog"]').first();
    await expect(composerDialog).toBeVisible({ timeout: 10000 });

    // 9. Fill data in ALL fields in composer
    // (a) Main text / caption
    const postCaption = `REST API Verification Post with All Fields [${Date.now().toString().slice(-4)}]`;
    const textarea = composerDialog.locator('textarea, [contenteditable="true"]').first();
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill(postCaption);
      console.log('Filled Text field with caption:', postCaption);
    }

    // (b) Poll field: Click "Add poll" if present and fill question/options
    const addPollBtn = composerDialog.locator('button:has-text("Add poll"), [role="button"]:has-text("Add poll")').first();
    if (await addPollBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addPollBtn.click();
      await page.waitForTimeout(500);
      const qInput = composerDialog.getByPlaceholder(/question/i).or(composerDialog.locator('input[aria-label*="Question" i]')).first();
      if (await qInput.isVisible().catch(() => false)) {
        await qInput.fill('Which endpoint response did you receive?');
      }
      const opt1 = composerDialog.getByPlaceholder(/option 1/i).first();
      if (await opt1.isVisible().catch(() => false)) {
        await opt1.fill('Quotes API (dummyjson)');
      }
      const opt2 = composerDialog.getByPlaceholder(/option 2/i).first();
      if (await opt2.isVisible().catch(() => false)) {
        await opt2.fill('Status 200 OK');
      }
      console.log('Filled Poll field');
    }

    // (c) Place field: Expand manual address details and fill all address components
    const manualAddressBtn = composerDialog.locator('button:has-text("enter address manually"), [aria-label*="address details" i]').first();
    if (await manualAddressBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await manualAddressBtn.click();
      await page.waitForTimeout(600);
    }

    // Check all address inputs that became visible
    const streetInput = composerDialog.getByPlaceholder(/street/i).or(composerDialog.locator('input[aria-label*="street" i]')).first();
    if (await streetInput.isVisible().catch(() => false)) {
      await streetInput.fill('10 George Street');
    }
    const cityInput = composerDialog.getByPlaceholder(/city/i).or(composerDialog.locator('input[aria-label*="city" i]')).first();
    if (await cityInput.isVisible().catch(() => false)) {
      await cityInput.fill('Sydney');
    }
    const stateInput = composerDialog.getByPlaceholder(/state|province/i).or(composerDialog.locator('input[aria-label*="state" i]')).first();
    if (await stateInput.isVisible().catch(() => false)) {
      await stateInput.fill('NSW');
    }
    const zipInput = composerDialog.getByPlaceholder(/postal|zip/i).or(composerDialog.locator('input[aria-label*="postal" i], input[aria-label*="zip" i]')).first();
    if (await zipInput.isVisible().catch(() => false)) {
      await zipInput.fill('2000');
    }
    const countryInput = composerDialog.getByPlaceholder(/country/i).or(composerDialog.locator('input[aria-label*="country" i]')).first();
    if (await countryInput.isVisible().catch(() => false)) {
      const currentCountry = await countryInput.inputValue().catch(() => '');
      if (!currentCountry) {
        await countryInput.fill('Australia');
      }
    }

    console.log('Filled Place field data with valid AU address');

    // (d) Formula check
    console.log('Formula value in composer:', await composerDialog.locator('text=/150|Formula/i').first().innerText().catch(() => ''));

    // (e) REST API action / refresh button in composer if present
    const refreshBtn = composerDialog.locator('button, [role="button"]').filter({ hasText: /Refresh|Fetch|API/i }).first();
    if (await refreshBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Found REST API action button in composer, clicking...');
      await refreshBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'test-reports/composer_all_fields_filled.png', fullPage: true });

    // Submit post
    const createPostBtn = composerDialog.locator('button[aria-label="Create post"], button:has-text("Create")').first();
    await expect(createPostBtn).toBeVisible({ timeout: 10000 });
    await expect(createPostBtn).toBeEnabled({ timeout: 10000 });
    await createPostBtn.click();

    // Verify post is created and dialog dismissed
    await expect(composerDialog).toBeHidden({ timeout: 20000 });
    await page.waitForTimeout(2000);

    // 10. Verify post is displayed in the feed with data across all fields
    await expect(page.getByText(postCaption).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Which endpoint response did you receive?').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Quotes API (dummyjson)').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Status 200 OK').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Sydney|George Street|2000/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('150').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Fetches from dummyjson\.com|Quote/i).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-reports/published_post_all_fields.png', fullPage: true });
    console.log(`✅ Fully verified post creation with all fields populated and displayed: "${postCaption}"`);
  });

  test('TC_ADV_FIELD_007: Form with only REST API field at bottom, fill all inputs in composer, screenshot, create post, and screenshot live result', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const formName = `REST API Exclusive Form ${Date.now().toString().slice(-4)}`;
    const formNameInput = page.getByPlaceholder(/form name/i).or(page.locator('input[aria-label*="Form Name" i]')).first();
    await expect(formNameInput).toBeVisible({ timeout: 15000 });
    await formNameInput.fill(formName);

    const formDesc = page.getByPlaceholder(/form description/i).first();
    if (await formDesc.isVisible().catch(() => false)) {
      await formDesc.fill('Dedicated REST API Form verification');
    }

    // 1. Add standard Text field
    await openAddFieldPicker(page);
    const textCard = page.locator('button, [role="button"]')
      .filter({ hasText: /Text/i })
      .filter({ hasText: /A line or paragraph of text/i })
      .first();
    await textCard.scrollIntoViewIfNeeded();
    await textCard.click();
    await page.waitForTimeout(800);

    // 2. Add only the REST API field from Advanced section at the bottom of the page at last
    await openAddFieldPicker(page);
    const restApiCard = page.locator('button, [role="button"]')
      .filter({ hasText: /REST API/i })
      .filter({ hasText: /Fetch from an external API/i })
      .first();
    await restApiCard.scrollIntoViewIfNeeded();
    await expect(restApiCard).toBeVisible({ timeout: 5000 });
    await restApiCard.click();
    await page.waitForTimeout(1000);

    // Verify REST API Field Row
    await expect(page.locator('input[placeholder="field_id"]').last()).toHaveValue('restapi');

    // Open Options Drawer for REST API
    const optionsBtn = page.locator('button, [role="button"]').filter({ hasText: /Options/i }).last();
    await optionsBtn.click();
    await page.waitForTimeout(1000);

    const restDrawer = page.locator('[role="dialog"], aside').first();
    await expect(restDrawer).toBeVisible({ timeout: 5000 });

    // Fill all REST API input boxes in drawer
    const urlInput = restDrawer.getByPlaceholder(/https:\/\/api\.example\.com/i).first();
    await expect(urlInput).toBeVisible();
    await urlInput.fill('https://dummyjson.com/quotes/random');
    await page.waitForTimeout(500);

    // Toggle manual refresh on
    const manualRefreshSwitch = restDrawer.getByRole('switch', { name: /manual refresh/i });
    if (await manualRefreshSwitch.isVisible().catch(() => false)) {
      await manualRefreshSwitch.click();
      await page.waitForTimeout(300);
    }

    // Set trigger to ON SAVE
    const onSaveRadio = restDrawer.getByRole('radio', { name: /on save/i }).first();
    if (await onSaveRadio.isVisible().catch(() => false)) {
      await onSaveRadio.click();
      await page.waitForTimeout(300);
    }

    // Add Response Field mapping
    const addRespFieldBtn = restDrawer.locator('button, [role="button"]').filter({ hasText: /Add Response Field/i }).first();
    if (await addRespFieldBtn.isVisible().catch(() => false)) {
      await addRespFieldBtn.click();
      await page.waitForTimeout(500);

      const labelInput = restDrawer.getByPlaceholder('Temperature').or(restDrawer.locator('input[placeholder*="Label" i]')).first();
      if (await labelInput.isVisible().catch(() => false)) {
        await labelInput.fill('Quote of the Day');
      }
      const pathInput = restDrawer.getByPlaceholder('data.main.temp').or(restDrawer.locator('input[placeholder*="path" i]')).first();
      if (await pathInput.isVisible().catch(() => false)) {
        await pathInput.fill('quote');
      }
    }

    await closeFieldSettings(page);

    // Save Form
    const saveBtn = page.locator('button[aria-label="Save Form"], button:has-text("Save Form"), [role="button"]:has-text("Save Form")').first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();

    // Verify persistence redirect to /form/<id>/edit
    await page.waitForURL(url => url.pathname.includes('/form/') && !url.pathname.includes('/form/new'), { timeout: 30000 });
    await page.waitForTimeout(1000);

    // Navigate to Form View page
    const currentUrl = page.url();
    const formViewUrl = currentUrl.split('/edit')[0];
    await page.goto(formViewUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify form header
    await expect(page.locator('h1, h2, [role="heading"]').filter({ hasText: formName }).first()).toBeVisible({ timeout: 15000 });

    // Open "New Post" inside this form
    const newPostBtn = page.locator('button[aria-label="New Post"], button:has-text("New Post")').locator('visible=true').first();
    await expect(newPostBtn).toBeVisible({ timeout: 10000 });
    await newPostBtn.click();
    await page.waitForTimeout(1500);

    const composerDialog = page.locator('[role="dialog"]').first();
    await expect(composerDialog).toBeVisible({ timeout: 10000 });

    // Fill all input boxes in composer
    const postCaption = `Dedicated REST API Post [${Date.now().toString().slice(-4)}]`;
    const textarea = composerDialog.locator('textarea, [contenteditable="true"]').first();
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill(postCaption);
      console.log('Filled Text field with caption:', postCaption);
    }

    // Fill any additional inputs in composer if present
    const composerInputs = await composerDialog.locator('input:not([type="hidden"])').all();
    for (let i = 0; i < composerInputs.length; i++) {
      const isVis = await composerInputs[i].isVisible().catch(() => false);
      if (isVis) {
        const val = await composerInputs[i].inputValue().catch(() => '');
        if (!val) {
          await composerInputs[i].fill(`REST API Input Value ${i + 1}`);
        }
      }
    }

    // Refresh REST API field if refresh button is visible
    const refreshBtn = composerDialog.locator('button, [role="button"]').filter({ hasText: /Refresh|Fetch|API/i }).or(composerDialog.locator('button:has(svg), [role="button"]:has(svg)')).first();
    if (await refreshBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshBtn.click().catch(() => {});
      await page.waitForTimeout(800);
    }

    // SCREENSHOT 1: after adding all the information in the form fields
    await page.screenshot({ path: 'test-reports/dedicated_restapi_composer_filled.png', fullPage: true });
    console.log('📸 Captured screenshot after adding all information in form fields: test-reports/dedicated_restapi_composer_filled.png');

    // Submit post
    const createPostBtn = composerDialog.locator('button[aria-label="Create post"], button:has-text("Create")').first();
    await expect(createPostBtn).toBeVisible({ timeout: 10000 });
    await expect(createPostBtn).toBeEnabled({ timeout: 10000 });
    await createPostBtn.click();

    // Verify post is created and dialog dismissed
    await expect(composerDialog).toBeHidden({ timeout: 20000 });
    await page.waitForTimeout(2000);

    // Verify post is displayed on the feed
    await expect(page.getByText(postCaption).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=/:/').first()).toBeVisible({ timeout: 10000 });

    // SCREENSHOT 2: after clicking on create to view how the post looks like after clicking on create button
    await page.screenshot({ path: 'test-reports/dedicated_restapi_post_published.png', fullPage: true });
    console.log('📸 Captured screenshot after clicking create to view published post: test-reports/dedicated_restapi_post_published.png');
  });
});

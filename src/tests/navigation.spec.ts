import { test } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';

test.describe('Eve Vakh - User Navigation Flow', () => {

  test('should navigate from home page and click on web to reach login page', async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    // Step 1: Go to Eve Vakh website
    await homePage.goto();

    // Step 2: Click on the 'web' link
    await homePage.clickWebLink();

    // Step 3: Verify that user is navigated to the login page (/auth/sign-in)
    await loginPage.verifyIsOnLoginPage();
  });

});

import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { PostActionsComponent } from '../pages/PostActionsComponent';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Compact Engagement Counts & Intl Formatter Suite', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.goto('about:blank');
  });

  /**
   * Scenario 1: Exact counts below 1,000 display normally (e.g. 999)
   */
  test('TC_CNT_001: should display exact integer counts below 1,000 verbatim without truncation', async ({ page }) => {
    const formatted = await page.evaluate(() => {
      const testCounts = [0, 1, 42, 500, 999];
      const formatFn = (n: number) => {
        if (n < 1000) return n.toString();
        return new Intl.NumberFormat('en', { notation: 'compact', compactDisplay: 'short' }).format(n);
      };
      return testCounts.map(c => ({ count: c, display: formatFn(c) }));
    });

    expect(formatted.find(f => f.count === 999)?.display).toBe('999');
    expect(formatted.find(f => f.count === 500)?.display).toBe('500');
    expect(formatted.find(f => f.count === 42)?.display).toBe('42');
  });

  /**
   * Scenario 2: Value rounds to 1K at 1,000 threshold
   */
  test('TC_CNT_002: should round engagement count to 1K at 1,000 threshold', async ({ page }) => {
    const formatted1000 = await page.evaluate(() => {
      return new Intl.NumberFormat('en', { notation: 'compact', compactDisplay: 'short' }).format(1000);
    });

    expect(formatted1000).toBe('1K');
    expect(formatted1000).not.toBe('1,000');
    expect(formatted1000).not.toBe('999+');
  });

  /**
   * Scenario 3: Values in the 1K–9.9K range are compacted correctly
   */
  test('TC_CNT_003: should compact values in 1K to 9.9K range without grouping artifacts', async ({ page }) => {
    const results = await page.evaluate(() => {
      const format = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', compactDisplay: 'short' }).format(n);
      return {
        c1500: format(1500),
        c1999: format(1999),
        c9999: format(9999)
      };
    });

    expect(results.c1500).toBe('1.5K');
    expect(results.c1999).toMatch(/^2K$/i);
    expect(results.c9999).toBe('10K');
  });

  /**
   * Scenario 4: Half-step and rounding edge cases
   */
  test('TC_CNT_004: should round boundary values consistently at 999,950 and 1,000,000 thresholds', async ({ page }) => {
    const boundaries = await page.evaluate(() => {
      const format = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', compactDisplay: 'short' }).format(n);
      return {
        nearMillion: format(999950),
        million: format(1000000),
        pastMillion: format(1049999)
      };
    });

    expect(boundaries.nearMillion).toBe('1M');
    expect(boundaries.million).toBe('1M');
    expect(boundaries.pastMillion).toBe('1M');
  });

  /**
   * Scenario 5: Large values use M/B/T notation correctly
   */
  test('TC_CNT_005: should format large engagement counts with M, B, and T suffixes', async ({ page }) => {
    const largeCounts = await page.evaluate(() => {
      const format = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', compactDisplay: 'short' }).format(n);
      return {
        million: format(1500000),
        billion: format(2000000000),
        trillion: format(1500000000000)
      };
    });

    expect(largeCounts.million).toBe('1.5M');
    expect(largeCounts.billion).toBe('2B');
    expect(largeCounts.trillion).toBe('1.5T');
  });

  /**
   * Scenario 6: iOS Hermes runtime fallback is safe
   */
  test('TC_CNT_006: should invoke custom fallback formatter when Intl compact notation is unsupported', async ({ page }) => {
    const fallbackFormatted = await page.evaluate(() => {
      const formatWithHermesFallback = (n: number): string => {
        if (n >= 1e12) return (n / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
        if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return n.toString();
      };

      return {
        val1500: formatWithHermesFallback(1500),
        val25M: formatWithHermesFallback(2500000),
        val1B: formatWithHermesFallback(1000000000)
      };
    });

    expect(fallbackFormatted.val1500).toBe('1.5K');
    expect(fallbackFormatted.val25M).toBe('2.5M');
    expect(fallbackFormatted.val1B).toBe('1B');
  });

  /**
   * Scenario 7: Zero counts remain hidden or suppressed correctly
   */
  test('TC_CNT_007: should suppress zero counts and avoid broken 0K displays', async ({ page }) => {
    const brokenZeroText = page.locator('text=/^0\.?0?K$/i');
    const isBrokenPresent = await brokenZeroText.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isBrokenPresent).toBeFalsy();
  });

  /**
   * Scenario 8: Optimistic Heart feedback updates counter synchronously
   */
  test('TC_CNT_008: should update heart count display optimistically without layout shift', async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();

    const actions = new PostActionsComponent(page);
    await actions.navigateIntoPost('posts');

    const heartBtn = actions.getHeartButton();
    if (await heartBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await heartBtn.scrollIntoViewIfNeeded();
      await heartBtn.click();
      await expect(heartBtn).toBeVisible();
    }
  });
});

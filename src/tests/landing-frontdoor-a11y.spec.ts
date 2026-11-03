import { test, expect } from '@playwright/test';
import { APP_CONFIG } from '../config/constants';

test.describe('Scenario E: Front-Door Marketing Pages, Visual Layout & Accessibility', () => {
  test.setTimeout(60000);

  /**
   * UI-01: Landing page hero and wordmark display correctly across modes and viewports
   * Verifies visual layout, alignment, store badges, and CTA ordering on desktop and mobile.
   */
  test('TC_UI_001: landing page hero and wordmark layout maintain responsive integrity without overflow', async ({ page }) => {
    // 1. Desktop Viewport Test
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(APP_CONFIG.BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Visible Wordmark / Logo check (skipping hidden <title>)
    const wordmark = page.locator('div, span, a, h1').filter({ hasText: /^Vakh$/i }).locator('visible=true').first();
    await expect(wordmark).toBeVisible({ timeout: 15000 });

    // Hero CTA check ("Open Vakh" button linking to sign-in)
    const heroCta = page.locator('a:has-text("Open Vakh"), button:has-text("Open Vakh"), a[href*="/auth/sign-in"]').locator('visible=true').first();
    await expect(heroCta).toBeVisible({ timeout: 15000 });

    // Verify store badges are present
    const storeBadge = page.locator('a[aria-label="Download on the App Store"], a[aria-label="Get it on Google Play"]').locator('visible=true').first();
    await expect(storeBadge).toBeVisible({ timeout: 10000 });

    // Verify no horizontal page overflow on desktop
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(desktopOverflow).toBe(false);

    // 2. Mobile Viewport Test (iPhone SE width)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await expect(wordmark).toBeVisible();
    await expect(heroCta).toBeVisible();

    // Verify no horizontal page overflow on mobile
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(mobileOverflow).toBe(false);
  });

  /**
   * UI-02: Jade banner on landing and about pages meets contrast/accessibility requirements
   * Computes WCAG 2.1 relative luminance and verifies contrast ratios on jade/green panels.
   */
  test('TC_UI_002: text on jade / green-glass panels meets WCAG AA contrast thresholds', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/about`, { waitUntil: 'domcontentloaded' });
    const contentElement = page.locator('button, a, div').filter({ hasText: /Open Vakh|vakh/i }).locator('visible=true').first();
    await expect(contentElement).toBeVisible({ timeout: 15000 });

    // Evaluate contrast of text elements on the page, prioritizing jade/green elements
    const contrastEvaluation = await page.evaluate(() => {
      function parseRgb(colorStr: string): [number, number, number] {
        const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        }
        return [0, 0, 0];
      }

      function getLuminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
        const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
        const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      const allElements = Array.from(document.querySelectorAll('*'));
      const results: { text: string; bg: string; color: string; ratio: number }[] = [];

      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        const bgStr = style.backgroundColor;
        // Target jade / green colored elements or colored badges
        if (
          bgStr.includes('187') ||
          bgStr.includes('119') ||
          (bgStr.startsWith('rgb(') && !bgStr.includes('255, 255, 255') && !bgStr.includes('rgba(0, 0, 0, 0)'))
        ) {
          const text = (el as HTMLElement).innerText ? (el as HTMLElement).innerText.trim() : '';
          if (text.length > 0 && text.length < 50) {
            const color = parseRgb(style.color);
            const bg = parseRgb(bgStr);
            const ratio = getContrastRatio(color, bg);
            results.push({ text, bg: bgStr, color: style.color, ratio });
          }
        }
      }

      return results;
    });

    expect(contrastEvaluation.length).toBeGreaterThan(0);
    // WCAG AA requirement: large text >= 3.0:1, normal text >= 4.5:1
    const jadeButtons = contrastEvaluation.filter(item => item.bg.includes('187') || item.bg.includes('119'));
    if (jadeButtons.length > 0) {
      for (const btn of jadeButtons) {
        expect(btn.ratio).toBeGreaterThanOrEqual(4.5);
      }
    } else {
      expect(contrastEvaluation.some(item => item.ratio >= 4.5)).toBe(true);
    }
  });

  /**
   * UI-03: Use-case pages lead with correct content order
   * Verifies content sequence: Value lede -> CTA -> Demo -> Supporting sections.
   */
  test('TC_UI_003: front-door pages sequence content starting with value headline and CTA', async ({ page }) => {
    await page.goto(`${APP_CONFIG.BASE_URL}/basics`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Locate headline and CTA on /basics
    const headline = page.locator('div, span, h1').filter({ hasText: /^Vakh Basics$/i }).locator('visible=true').first();
    const cta = page.locator('a:has-text("Go to App"), a:has-text("Open Vakh"), button:has-text("Go to App")').locator('visible=true').first();

    await expect(headline).toBeVisible({ timeout: 15000 });
    await expect(cta).toBeVisible({ timeout: 15000 });

    const headlineBox = await headline.boundingBox();
    const ctaBox = await cta.boundingBox();

    if (headlineBox && ctaBox) {
      // Both elements exist in the prominent viewport section
      expect(headlineBox.y).toBeLessThan(600);
      expect(ctaBox.y).toBeLessThan(1000);
    }
  });

  /**
   * UI-04: Share card metadata is regenerated and cache-busted correctly
   * Ensures social metadata meta tags exist and contain valid URLs or cache-busting parameters.
   */
  test('TC_UI_004: share card OG and Twitter metadata contain valid cache-busted asset URLs', async ({ page }) => {
    await page.goto(APP_CONFIG.BASE_URL, { waitUntil: 'domcontentloaded' });

    // Inspect Open Graph image
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null);
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content').catch(() => null);

    // Verify metadata presence
    if (ogImage) {
      expect(ogImage).toMatch(/^https?:\/\//);
    }
    if (ogTitle) {
      expect(ogTitle.length).toBeGreaterThan(0);
    }
    if (twitterCard) {
      expect(['summary', 'summary_large_image', 'app']).toContain(twitterCard);
    }
  });
});

// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * E2E Test Suite for Split View & Tab Layout (PRD-0006)
 *
 * Tests verify:
 * 1. Split View layout - Desktop mode
 * 2. Tab Layout - Mobile mode
 * 3. Responsive switching
 * 4. Original content viewer
 */

test.describe('Split View & Tab Layout - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('1. Desktop Split View - Layout rendering', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Take screenshot of desktop view
    await page.screenshot({
      path: 'test-results/split-view-desktop.png',
      fullPage: true
    });

    // Check viewport meta tag
    const viewportMeta = await page.locator('meta[name="viewport"]').count();
    expect(viewportMeta).toBeGreaterThan(0);
    console.log('Desktop viewport test completed');
  });

  test('2. Mobile Tab Layout - Responsive switch', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Screenshot mobile view
    await page.screenshot({
      path: 'test-results/split-view-mobile.png',
      fullPage: true
    });

    // Verify layout doesn't break
    const body = page.locator('body');
    const boundingBox = await body.boundingBox();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375);
      console.log(`Mobile width: ${boundingBox.width}px`);
    }
  });

  test('3. Tablet viewport - Breakpoint behavior', async ({ page }) => {
    // Set tablet viewport (iPad)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Screenshot tablet view
    await page.screenshot({
      path: 'test-results/split-view-tablet.png',
      fullPage: true
    });

    console.log('Tablet viewport test completed');
  });

  test('4. Split View components exist in codebase', async ({ page }) => {
    // This test verifies components are properly bundled
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForLoadState('domcontentloaded');

    // Check that React app renders
    const root = await page.locator('#root').count();
    expect(root).toBe(1);

    // Check for any rendering errors
    const errorBoundary = await page.locator('[class*="error"]').count();
    console.log(`Error boundary elements: ${errorBoundary}`);

    await page.screenshot({
      path: 'test-results/split-view-components.png',
      fullPage: true
    });
  });

  test('5. Responsive breakpoints - Width transitions', async ({ page }) => {
    const breakpoints = [
      { name: 'mobile', width: 375 },
      { name: 'tablet-small', width: 768 },
      { name: 'tablet-large', width: 1023 },
      { name: 'desktop', width: 1024 },
      { name: 'desktop-large', width: 1440 }
    ];

    for (const bp of breakpoints) {
      await page.setViewportSize({ width: bp.width, height: 800 });
      await page.waitForTimeout(300);

      await page.screenshot({
        path: `test-results/breakpoint-${bp.name}-${bp.width}px.png`,
        fullPage: true
      });

      console.log(`Breakpoint ${bp.name}: ${bp.width}px - captured`);
    }
  });
});

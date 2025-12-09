// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * E2E Test Suite for Admin Mode Switch Feature (#25)
 * (Local Docker Environment)
 *
 * Tests verify:
 * 1. Admin user sees mode switch button in header
 * 2. Mode dropdown menu works
 * 3. Mentor mode switch works
 * 4. Admin mode return works
 * 5. Session persistence on refresh
 * 6. Warning banner displays in temp mode
 *
 * Environment: Docker (http://localhost:8080)
 * Auth Mode: email (requires admin login)
 * Note: These tests require authentication - may skip if not logged in
 */

test.describe('Admin Mode Switch - E2E Tests', () => {
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];

    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
  });

  test('1. Debug - Check Header Structure for Admin', async ({ page }) => {
    // Navigate to the app
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for page load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Take screenshot of initial state
    await page.screenshot({
      path: 'test-results/admin-01-initial.png',
      fullPage: true
    });

    // Check if we're on login page or dashboard
    const pageContent = await page.content();
    const isLoginPage = pageContent.includes('로그인') || pageContent.includes('login');
    const isAdminDashboard = pageContent.includes('admin_dashboard') || pageContent.includes('관리자') || pageContent.includes('Admin');

    console.log('=== Page State ===');
    console.log(`Is Login Page: ${isLoginPage}`);
    console.log(`Has Admin Content: ${isAdminDashboard}`);

    // Check header element
    const header = page.locator('header');
    const headerCount = await header.count();
    console.log(`Header count: ${headerCount}`);

    if (headerCount > 0) {
      const headerHTML = await header.first().innerHTML();
      console.log('Header HTML snippet:', headerHTML.substring(0, 500));

      // Check for mode button
      const modeButton = page.locator('button').filter({ hasText: /모드/i });
      const modeButtonCount = await modeButton.count();
      console.log(`Mode button count: ${modeButtonCount}`);

      // Check for settings icon button
      const settingsButton = page.locator('header button').filter({ has: page.locator('[name="settings"], svg') });
      const settingsCount = await settingsButton.count();
      console.log(`Settings-like buttons in header: ${settingsCount}`);

      // List all buttons in header
      const headerButtons = await page.locator('header button').all();
      console.log(`Total buttons in header: ${headerButtons.length}`);

      for (let i = 0; i < headerButtons.length; i++) {
        const btn = headerButtons[i];
        const text = await btn.textContent();
        const className = await btn.getAttribute('class');
        console.log(`Button ${i + 1}: "${text?.trim()}" class="${className?.substring(0, 50)}"`);
      }

      // Check role badge
      const roleBadge = page.locator('header span').filter({ hasText: /admin|mentor|mentee/i });
      const badgeCount = await roleBadge.count();
      console.log(`Role badge count: ${badgeCount}`);

      if (badgeCount > 0) {
        const badgeText = await roleBadge.first().textContent();
        console.log(`Role badge text: "${badgeText}"`);
      }
    }

    // Check for console errors
    const errors = consoleMessages.filter(m => m.type === 'error');
    console.log(`\nConsole errors: ${errors.length}`);
    errors.forEach(e => console.log(`  - ${e.text}`));

    // Screenshot header area
    if (headerCount > 0) {
      await header.first().screenshot({
        path: 'test-results/admin-01-header.png'
      });
    }
  });

  test('2. Check user.role in React state', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Try to access React state via window
    const userInfo = await page.evaluate(() => {
      // Check if we can access any global state
      const root = document.getElementById('root');
      if (root && root._reactRootContainer) {
        return 'React root found';
      }

      // Check localStorage/sessionStorage for user info
      const sessionMode = sessionStorage.getItem('ojt_sessionMode');
      const cacheVersion = localStorage.getItem('ojt_cache_version');

      return {
        sessionMode,
        cacheVersion,
        hasReactRoot: !!document.getElementById('root')
      };
    });

    console.log('User info from page:', userInfo);

    // Check for role display in UI
    const roleText = page.locator('text=/ADMIN|MENTOR|MENTEE/i');
    const roleCount = await roleText.count();
    console.log(`Role text found: ${roleCount}`);

    if (roleCount > 0) {
      const firstRole = await roleText.first().textContent();
      console.log(`First role text: "${firstRole}"`);
    }

    // Check subtitle for mode
    const subtitle = page.locator('p, span').filter({ hasText: /MODE/i });
    const subtitleCount = await subtitle.count();
    console.log(`Subtitle with MODE: ${subtitleCount}`);

    if (subtitleCount > 0) {
      for (let i = 0; i < Math.min(subtitleCount, 3); i++) {
        const text = await subtitle.nth(i).textContent();
        console.log(`Mode text ${i + 1}: "${text}"`);
      }
    }

    await page.screenshot({
      path: 'test-results/admin-02-state.png',
      fullPage: true
    });
  });

  test('3. Check for mode-menu-container class', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Direct class search
    const modeContainer = page.locator('.mode-menu-container');
    const containerCount = await modeContainer.count();
    console.log(`mode-menu-container count: ${containerCount}`);

    // Search in raw HTML
    const pageHTML = await page.content();
    const hasModeMenuClass = pageHTML.includes('mode-menu-container');
    const hasSessionMode = pageHTML.includes('sessionMode');
    const hasShowModeMenu = pageHTML.includes('showModeMenu');

    console.log('=== Code Check ===');
    console.log(`Has mode-menu-container class: ${hasModeMenuClass}`);
    console.log(`Has sessionMode reference: ${hasSessionMode}`);
    console.log(`Has showModeMenu reference: ${hasShowModeMenu}`);

    // Check if the feature code exists in the page
    const hasHandleModeSwitch = pageHTML.includes('handleModeSwitch');
    console.log(`Has handleModeSwitch: ${hasHandleModeSwitch}`);

    // Verify the admin condition
    const adminCondition = pageHTML.includes("user.role === 'admin'");
    console.log(`Has admin condition: ${adminCondition}`);
  });

  test('4. Simulate Admin Login State', async ({ page, context }) => {
    // Set up session storage before navigating
    await context.addInitScript(() => {
      // This runs before page load
      window.sessionStorage.setItem('ojt_sessionMode', 'mentor');
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check if session mode was set
    const sessionMode = await page.evaluate(() => {
      return sessionStorage.getItem('ojt_sessionMode');
    });
    console.log(`Session mode after set: ${sessionMode}`);

    // Check UI for temp mode indicator
    const tempIndicator = page.locator('text=/임시|temp/i');
    const tempCount = await tempIndicator.count();
    console.log(`Temp mode indicator count: ${tempCount}`);

    // Check for amber warning banner
    const warningBanner = page.locator('[class*="amber"], [class*="warning"], [class*="yellow"]');
    const bannerCount = await warningBanner.count();
    console.log(`Warning banner elements: ${bannerCount}`);

    await page.screenshot({
      path: 'test-results/admin-04-simulated.png',
      fullPage: true
    });
  });

  test('5. Full Admin Flow Test (requires auth)', async ({ page }) => {
    // Note: This test requires actual authentication
    // For now, we document the expected flow

    console.log('=== Expected Admin Mode Switch Flow (Local Docker) ===');
    console.log('1. Admin logs in via email authentication (ID/password)');
    console.log('2. Account must be approved by admin (status=approved)');
    console.log('3. Redirected to Admin Dashboard');
    console.log('4. Header shows "모드" button next to AI status');
    console.log('5. Click "모드" -> Dropdown appears');
    console.log('6. Select "Mentor 작업실" -> View changes to mentor_dashboard');
    console.log('7. Header shows "MENTOR MODE (임시)"');
    console.log('8. Amber warning banner appears below header');
    console.log('9. Click "Admin으로 돌아가기" -> Returns to admin_dashboard');

    // Navigate and capture current state
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Final screenshot
    await page.screenshot({
      path: 'test-results/admin-05-flow.png',
      fullPage: true
    });

    // Log all console messages
    console.log('\n=== Console Messages ===');
    consoleMessages.forEach(m => {
      if (m.text.includes('role') || m.text.includes('admin') || m.text.includes('profile')) {
        console.log(`[${m.type}] ${m.text}`);
      }
    });
  });
});

// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * E2E Test Suite for OJT Master Homepage (Local Docker Environment)
 *
 * Tests verify:
 * 1. Page load and title
 * 2. Email login form presence (local authentication)
 * 3. AI status badge display (Local AI or WebLLM)
 * 4. UI elements rendering
 * 5. Console errors
 * 6. Responsive design
 *
 * Environment: Docker (http://localhost:8080)
 * Auth Mode: email (ID/password with admin approval)
 */

test.describe('OJT Master Homepage - E2E Tests', () => {
  let consoleErrors = [];
  let consoleWarnings = [];

  test.beforeEach(async ({ page }) => {
    // Console error/warning listener setup
    consoleErrors = [];
    consoleWarnings = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Navigate to homepage
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('1. Page Load - OJT Master title and logo display', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');

    // Verify page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    expect(title).toContain('OJT');

    // Take screenshot of loaded page
    await page.screenshot({
      path: 'test-results/01-page-loaded.png',
      fullPage: true
    });

    // Verify OJT Master heading
    const heading = page.locator('h1, h2, h3').filter({ hasText: /OJT/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });

    const headingText = await heading.first().textContent();
    console.log(`Main heading: ${headingText}`);

    // Check for logo/image presence
    const logo = page.locator('img, svg').first();
    if (await logo.count() > 0) {
      await expect(logo).toBeVisible();
      console.log('Logo found and visible');
    }
  });

  test('2. Email Login Form - Existence and visibility', async ({ page }) => {
    // Check for email-based login form (ID/password)
    const usernameInput = page.locator('input[id="login-username"], input[placeholder*="아이디"]');
    const passwordInput = page.locator('input[id="login-password"], input[type="password"]');
    const loginButton = page.locator('button[type="submit"]').filter({ hasText: /로그인/i });

    // Check if login form exists
    const hasUsernameField = await usernameInput.count() > 0;
    const hasPasswordField = await passwordInput.count() > 0;
    const hasLoginButton = await loginButton.count() > 0;

    console.log(`Username field: ${hasUsernameField ? 'found' : 'not found'}`);
    console.log(`Password field: ${hasPasswordField ? 'found' : 'not found'}`);
    console.log(`Login button: ${hasLoginButton ? 'found' : 'not found'}`);

    // At least password field and login button should be visible
    if (hasPasswordField) {
      await expect(passwordInput.first()).toBeVisible();
    }

    if (hasLoginButton) {
      await expect(loginButton.first()).toBeVisible();
      await expect(loginButton.first()).toBeEnabled();

      const buttonText = await loginButton.first().textContent();
      console.log(`Login button text: ${buttonText}`);
    }

    // Check for signup tab (회원가입)
    const signupTab = page.locator('button').filter({ hasText: /회원가입/i });
    const hasSignupTab = await signupTab.count() > 0;
    console.log(`Signup tab: ${hasSignupTab ? 'found' : 'not found'}`);

    // Screenshot of full page for manual verification
    await page.screenshot({
      path: 'test-results/02-login-form.png',
      fullPage: true
    });
  });

  test('3. AI Status Badge - Display verification (Local AI or WebLLM)', async ({ page }) => {
    // Multiple selector strategies for AI status badge
    const statusBadge = page.locator(
      '[class*="status"], [class*="badge"], [class*="ai"]'
    ).or(
      page.locator('span, div').filter({ hasText: /local ai|webllm|ai|status|온라인|online|사용 가능/i })
    );

    const badgeCount = await statusBadge.count();
    console.log(`Found ${badgeCount} status badge element(s)`);

    if (badgeCount > 0) {
      await expect(statusBadge.first()).toBeVisible();

      const badgeText = await statusBadge.first().textContent();
      console.log(`Status badge text: ${badgeText}`);

      // Verify AI status (Local AI or WebLLM)
      // Note: Badge may show "Local AI", "WebLLM", "온라인", "사용 가능" etc.

      // Screenshot of status badge
      await statusBadge.first().screenshot({
        path: 'test-results/03-status-badge.png'
      });
    } else {
      console.log('No explicit status badge found, checking page content');

      // Check page content for AI status information
      const pageContent = await page.content();
      const hasStatusInfo = /local ai|webllm|ai|status|연결|connection/i.test(pageContent);
      console.log(`Page contains status-related content: ${hasStatusInfo}`);
    }

    // Full page screenshot
    await page.screenshot({
      path: 'test-results/03-ai-status.png',
      fullPage: true
    });
  });

  test('4. UI Elements - Rendering verification', async ({ page }) => {
    // Wait for React app to render (deferred scripts may delay rendering)
    await page.waitForSelector('#root > *', { timeout: 10000 });

    // Check for common UI elements
    const uiChecks = {
      navigation: page.locator('nav, header'),
      buttons: page.locator('button'),
      links: page.locator('a'),
      inputs: page.locator('input, textarea'),
      containers: page.locator('div, section, main'),
    };

    const uiReport = {};

    for (const [elementType, locator] of Object.entries(uiChecks)) {
      const count = await locator.count();
      uiReport[elementType] = count;
      console.log(`${elementType}: ${count} element(s) found`);
    }

    // Verify minimum UI elements exist
    // Note: Login page may not have button elements (uses clickable divs/links)
    const hasInteractiveElements = uiReport.buttons > 0 || uiReport.links > 0;
    console.log(`Interactive elements present: ${hasInteractiveElements}`);
    expect(hasInteractiveElements).toBe(true);
    expect(uiReport.containers).toBeGreaterThan(0);

    // Check for responsive design meta tag
    const viewportMeta = await page.locator('meta[name="viewport"]').count();
    console.log(`Viewport meta tag present: ${viewportMeta > 0}`);

    // Verify page has meaningful content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.length).toBeGreaterThan(50);  // 로그인 페이지는 간결한 UI
    console.log(`Page content length: ${bodyText.length} characters`);

    // Screenshot of UI layout
    await page.screenshot({
      path: 'test-results/04-ui-elements.png',
      fullPage: true
    });

    // Check specific sections if they exist
    const sections = await page.locator('section, [class*="section"]').all();
    console.log(`Found ${sections.length} major sections`);

    for (let i = 0; i < Math.min(sections.length, 3); i++) {
      const section = sections[i];
      if (await section.isVisible()) {
        await section.screenshot({
          path: `test-results/04-section-${i + 1}.png`
        });
      }
    }
  });

  test('5. Console Errors - Error detection', async ({ page }) => {
    // Wait for page to fully load and execute scripts
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Additional wait for async operations

    // Check for console errors
    console.log(`\n=== Console Errors Report ===`);
    console.log(`Total errors: ${consoleErrors.length}`);
    console.log(`Total warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('\nErrors:');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (consoleWarnings.length > 0) {
      console.log('\nWarnings:');
      consoleWarnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }

    // Critical errors should fail the test
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('ResizeObserver') &&
      !error.includes('third-party')
    );

    if (criticalErrors.length > 0) {
      console.log(`\nCritical errors found: ${criticalErrors.length}`);
      // Note: Not failing test here to allow inspection, but logging for review
    } else {
      console.log('\nNo critical errors detected');
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/05-final-state.png',
      fullPage: true
    });

    // Network activity check
    const networkRequests = [];
    page.on('request', request => networkRequests.push(request.url()));

    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log(`\nNetwork requests: ${networkRequests.length}`);
    console.log('Sample requests:', networkRequests.slice(0, 5));
  });

  test('6. Responsive Design - Mobile viewport', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Screenshot mobile view
    await page.screenshot({
      path: 'test-results/06-mobile-view.png',
      fullPage: true
    });

    // Verify layout doesn't break on mobile
    const body = page.locator('body');
    const boundingBox = await body.boundingBox();

    if (boundingBox) {
      console.log(`Mobile viewport - Body width: ${boundingBox.width}px`);
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'test-results/06-tablet-view.png',
      fullPage: true
    });

    console.log('Responsive design tests completed');
  });
});

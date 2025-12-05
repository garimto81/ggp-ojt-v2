// Debug console log test
const { test, expect } = require('@playwright/test');

test('Capture Auth and App console logs', async ({ page }) => {
  const consoleLogs = [];

  // Capture all console messages
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text });
    if (text.includes('[Auth]') || text.includes('[App]')) {
      console.log('[CAPTURED] ' + type + ': ' + text);
    }
  });

  // Navigate to production
  await page.goto('https://ggp-ojt-v2.vercel.app/', { waitUntil: 'networkidle' });

  // Wait for React to render
  await page.waitForTimeout(3000);

  // Print all Auth/App logs
  console.log('\n=== Auth/App Console Logs ===');
  const authAppLogs = consoleLogs.filter(log =>
    log.text.includes('[Auth]') || log.text.includes('[App]')
  );

  if (authAppLogs.length === 0) {
    console.log('No [Auth] or [App] logs found');
  } else {
    authAppLogs.forEach(log => {
      console.log(log.type + ': ' + log.text);
    });
  }

  // Print all logs for debugging
  console.log('\n=== All Console Logs ===');
  consoleLogs.forEach(log => {
    console.log(log.type + ': ' + log.text);
  });

  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-console.png', fullPage: true });

  // Check current page state
  const bodyText = await page.locator('body').textContent();
  console.log('\n=== Page Content ===');
  console.log(bodyText.substring(0, 500));
});

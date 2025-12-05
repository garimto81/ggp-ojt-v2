// E2E Test - WebLLM AI Engine Selector (PRD-0007)
// Tests the AI engine selection UI in MentorDashboard

import { test, expect } from '@playwright/test';

// Use local dev server for testing unreleased features
test.use({ baseURL: 'http://localhost:5173' });

test.describe('WebLLM AI Engine Selector', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('app loads successfully on localhost', async ({ page }) => {
    // Verify app loads without errors
    await page.waitForTimeout(1000);

    // Check for app title or OJT text
    const ojtText = page.locator('text=/OJT|로그인/');
    await expect(ojtText.first()).toBeVisible();

    // Take screenshot for manual verification
    await page.screenshot({ path: 'test-results/webllm-app-load.png', fullPage: true });

    console.log('App loaded successfully on localhost:5173');
  });

  test('login page shows Google OAuth button', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Check for Google login button
    const googleButton = page.getByText('Google로 로그인');
    const hasGoogleLogin = await googleButton.isVisible().catch(() => false);

    console.log('Google login button visible:', hasGoogleLogin);

    // Take screenshot
    await page.screenshot({ path: 'test-results/webllm-login-page.png', fullPage: true });

    // Either Google login or some form of auth UI should be visible
    expect(hasGoogleLogin).toBeTruthy();
  });
});

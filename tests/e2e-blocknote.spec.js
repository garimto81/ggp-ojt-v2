// E2E Tests for BlockNote Editor (src-vite v3.0.0)
import { test, expect } from '@playwright/test';

test.describe('BlockNote Editor - E2E Tests', () => {
  // Override base URL for src-vite app (Vite default port)
  test.use({ baseURL: 'http://localhost:5173' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('1. src-vite app loads successfully', async ({ page }) => {
    // Check page title
    const title = await page.title();
    console.log('Page title:', title);
    expect(title).toContain('OJT');
  });

  test('2. No critical console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(3000);

    console.log('Total console errors:', errors.length);
    if (errors.length > 0) {
      console.log('Errors:');
      errors.forEach(e => console.log('  -', e.substring(0, 100)));
    }

    // Allow some errors (e.g., Supabase auth errors when not logged in)
    // But fail on critical React/BlockNote errors
    const criticalErrors = errors.filter(e =>
      e.includes('React') ||
      e.includes('BlockNote') ||
      e.includes('Cannot read') ||
      e.includes('is not defined')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('3. React app renders', async ({ page }) => {
    // Check if React root exists and has content
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    const childCount = await rootElement.evaluate(el => el.children.length);
    console.log('Root element children:', childCount);
    expect(childCount).toBeGreaterThan(0);
  });

  test('4. Login page or main content displays', async ({ page }) => {
    // Either login button or main content should be visible
    const hasLoginButton = await page.locator('text=Google').count() > 0 ||
                           await page.locator('text=로그인').count() > 0 ||
                           await page.locator('[data-testid="login"]').count() > 0;

    const hasMainContent = await page.locator('text=OJT Master').count() > 0;

    console.log('Has login button:', hasLoginButton);
    console.log('Has main content:', hasMainContent);

    expect(hasLoginButton || hasMainContent).toBe(true);
  });
});

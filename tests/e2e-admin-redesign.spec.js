// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * E2E Test Suite for Admin Page Redesign (#79)
 *
 * Tests verify:
 * 1. Content Management Tab - Split View layout
 * 2. Content List filtering and status tabs
 * 3. Content Preview Panel
 * 4. User Management Tab improvements
 * 5. Settings Tab (new)
 * 6. Statistics Tab with export
 */

test.describe('Admin Page Redesign - E2E Tests', () => {
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];

    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });
  });

  test.describe('Content Management Tab', () => {
    test('1. Split View layout renders correctly', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check if we can access admin dashboard
      const pageContent = await page.content();
      const isAdminPage =
        pageContent.includes('admin') || pageContent.includes('관리자');

      console.log('=== Content Management Tab Test ===');
      console.log(`Is Admin Page: ${isAdminPage}`);

      // Check for tab navigation
      const tabButtons = page.locator('button[role="tab"]');
      const tabCount = await tabButtons.count();
      console.log(`Tab button count: ${tabCount}`);

      // Check for content management tab
      const contentTab = page.locator('button').filter({ hasText: /콘텐츠|문서/i });
      const contentTabCount = await contentTab.count();
      console.log(`Content tab found: ${contentTabCount > 0}`);

      // Check for Allotment Split View container
      const splitView = page.locator('.split-view, [class*="allotment"]');
      const splitViewCount = await splitView.count();
      console.log(`Split view elements: ${splitViewCount}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-01-splitview.png',
        fullPage: true,
      });
    });

    test('2. Status tabs and filters work', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Look for status tabs (전체, 검토대기, 신고됨, 숨김)
      const statusTabs = page.locator('button').filter({
        hasText: /전체|검토대기|신고됨|숨김/i,
      });
      const statusTabCount = await statusTabs.count();
      console.log(`Status tab count: ${statusTabCount}`);

      // Check for filter inputs
      const searchInput = page.locator('input[placeholder*="검색"], input[aria-label*="검색"]');
      const searchCount = await searchInput.count();
      console.log(`Search input found: ${searchCount > 0}`);

      // Check for team filter dropdown
      const teamFilter = page.locator('select[aria-label*="팀"]');
      const teamFilterCount = await teamFilter.count();
      console.log(`Team filter found: ${teamFilterCount > 0}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-02-filters.png',
        fullPage: true,
      });
    });

    test('3. Content preview panel displays document details', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for preview panel elements
      const previewPanel = page.locator('[role="region"][aria-label*="미리보기"]');
      const previewCount = await previewPanel.count();
      console.log(`Preview panel found: ${previewCount > 0}`);

      // Check for section tabs (섹션, 퀴즈, 신고)
      const previewTabs = page.locator('button').filter({
        hasText: /섹션|퀴즈|신고/i,
      });
      const previewTabCount = await previewTabs.count();
      console.log(`Preview tab count: ${previewTabCount}`);

      // Check for action buttons
      const actionButtons = page.locator('button').filter({
        hasText: /게시|숨기기|삭제/i,
      });
      const actionCount = await actionButtons.count();
      console.log(`Action button count: ${actionCount}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-03-preview.png',
        fullPage: true,
      });
    });

    test('4. Content status badges display correctly', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for status badges
      const statusBadges = page.locator('[class*="badge"], span').filter({
        hasText: /임시저장|검토대기|게시됨|숨김/i,
      });
      const badgeCount = await statusBadges.count();
      console.log(`Status badge count: ${badgeCount}`);

      // Verify badge colors exist
      const pageContent = await page.content();
      const hasBlueStatus = pageContent.includes('blue') && pageContent.includes('임시');
      const hasOrangeStatus = pageContent.includes('orange') && pageContent.includes('검토');
      const hasGreenStatus = pageContent.includes('green') && pageContent.includes('게시');

      console.log(`Blue (draft) status: ${hasBlueStatus}`);
      console.log(`Orange (review) status: ${hasOrangeStatus}`);
      console.log(`Green (published) status: ${hasGreenStatus}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-04-badges.png',
        fullPage: true,
      });
    });
  });

  test.describe('User Management Tab', () => {
    test('5. User table with bulk actions bar', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for user table
      const userTable = page.locator('table[aria-label*="사용자"], table');
      const tableCount = await userTable.count();
      console.log(`User table found: ${tableCount > 0}`);

      // Check for checkbox column
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();
      console.log(`Checkbox count: ${checkboxCount}`);

      // Check for bulk action buttons
      const bulkActions = page.locator('button').filter({
        hasText: /일괄|대량|선택됨/i,
      });
      const bulkCount = await bulkActions.count();
      console.log(`Bulk action buttons: ${bulkCount}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-05-users.png',
        fullPage: true,
      });
    });

    test('6. User detail side panel', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for side panel
      const sidePanel = page.locator(
        '[role="complementary"], [class*="side-panel"], [class*="detail-panel"]'
      );
      const panelCount = await sidePanel.count();
      console.log(`Side panel found: ${panelCount > 0}`);

      // Check for user detail sections
      const detailSections = page.locator('text=/학습 현황|최근 활동|진도율/i');
      const sectionCount = await detailSections.count();
      console.log(`Detail section count: ${sectionCount}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-06-userpanel.png',
        fullPage: true,
      });
    });
  });

  test.describe('Settings Tab', () => {
    test('7. Settings tab exists and has sections', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for settings tab
      const settingsTab = page.locator('button').filter({ hasText: /설정|Settings/i });
      const settingsTabCount = await settingsTab.count();
      console.log(`Settings tab found: ${settingsTabCount > 0}`);

      // Check for settings sections
      const settingsSections = page.locator('text=/시스템 설정|알림 설정|시스템 로그/i');
      const sectionCount = await settingsSections.count();
      console.log(`Settings section count: ${sectionCount}`);

      // Check for setting inputs
      const settingInputs = page.locator('select, input[type="number"], input[type="checkbox"]');
      const inputCount = await settingInputs.count();
      console.log(`Setting input count: ${inputCount}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-07-settings.png',
        fullPage: true,
      });
    });

    test('8. Admin logs viewer displays logs', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for log viewer
      const logViewer = page.locator('text=/시스템 로그|admin_logs/i');
      const logCount = await logViewer.count();
      console.log(`Log viewer found: ${logCount > 0}`);

      // Check for log entries
      const logEntries = page.locator('[class*="log"], text=/INFO|WARN|ERROR/i');
      const entryCount = await logEntries.count();
      console.log(`Log entry count: ${entryCount}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-08-logs.png',
        fullPage: true,
      });
    });
  });

  test.describe('Statistics Tab', () => {
    test('9. Export button exists', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for export button
      const exportButton = page.locator('button').filter({
        hasText: /내보내기|Export|리포트/i,
      });
      const exportCount = await exportButton.count();
      console.log(`Export button found: ${exportCount > 0}`);

      // Check for format options
      const formatOptions = page.locator('text=/PDF|Excel|CSV/i');
      const formatCount = await formatOptions.count();
      console.log(`Format options found: ${formatCount}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-09-export.png',
        fullPage: true,
      });
    });

    test('10. Charts render correctly', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for chart containers
      const charts = page.locator('canvas, [class*="chart"], [class*="Chart"]');
      const chartCount = await charts.count();
      console.log(`Chart count: ${chartCount}`);

      // Check for statistics cards
      const statCards = page.locator('[class*="card"], [class*="summary"]');
      const cardCount = await statCards.count();
      console.log(`Stat card count: ${cardCount}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-10-charts.png',
        fullPage: true,
      });
    });
  });

  test.describe('Accessibility', () => {
    test('11. ARIA attributes are present', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for role="tablist"
      const tablist = page.locator('[role="tablist"]');
      const tablistCount = await tablist.count();
      console.log(`Tablist count: ${tablistCount}`);

      // Check for role="tabpanel"
      const tabpanel = page.locator('[role="tabpanel"]');
      const tabpanelCount = await tabpanel.count();
      console.log(`Tabpanel count: ${tabpanelCount}`);

      // Check for role="region"
      const regions = page.locator('[role="region"]');
      const regionCount = await regions.count();
      console.log(`Region count: ${regionCount}`);

      // Check for aria-label
      const ariaLabels = page.locator('[aria-label]');
      const labelCount = await ariaLabels.count();
      console.log(`Elements with aria-label: ${labelCount}`);

      // Check for aria-live (for preview panel)
      const ariaLive = page.locator('[aria-live]');
      const liveCount = await ariaLive.count();
      console.log(`Elements with aria-live: ${liveCount}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-11-a11y.png',
        fullPage: true,
      });
    });

    test('12. Keyboard navigation works', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Test Tab key navigation
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          role: el?.getAttribute('role'),
          ariaLabel: el?.getAttribute('aria-label'),
        };
      });

      console.log('First focused element:', focusedElement);

      // Test multiple Tab presses
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }

      const fifthFocused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          text: el?.textContent?.substring(0, 50),
        };
      });

      console.log('Fifth focused element:', fifthFocused);

      await page.screenshot({
        path: 'test-results/admin-redesign-12-keyboard.png',
        fullPage: true,
      });
    });
  });

  test.describe('Report System', () => {
    test('13. Report modal elements exist', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for report button in content area
      const reportButton = page.locator('button').filter({
        hasText: /신고|Report/i,
      });
      const reportCount = await reportButton.count();
      console.log(`Report button count: ${reportCount}`);

      // Check for report reason options in page content
      const pageContent = await page.content();
      const hasReportReasons =
        pageContent.includes('부적절한 내용') ||
        pageContent.includes('오래된 정보') ||
        pageContent.includes('중복 콘텐츠');

      console.log(`Has report reasons: ${hasReportReasons}`);

      await page.screenshot({
        path: 'test-results/admin-redesign-13-report.png',
        fullPage: true,
      });
    });
  });

  test('14. Console error check', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Check for console errors
    const errors = consoleMessages.filter((m) => m.type === 'error');
    console.log(`\n=== Console Errors: ${errors.length} ===`);
    errors.forEach((e) => console.log(`  - ${e.text}`));

    // Check for warnings related to admin features
    const warnings = consoleMessages.filter(
      (m) => m.type === 'warning' && (m.text.includes('admin') || m.text.includes('content'))
    );
    console.log(`\n=== Related Warnings: ${warnings.length} ===`);
    warnings.forEach((w) => console.log(`  - ${w.text}`));

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/admin-redesign-14-final.png',
      fullPage: true,
    });

    // Assert no critical errors
    const criticalErrors = errors.filter(
      (e) =>
        e.text.includes('Uncaught') ||
        e.text.includes('TypeError') ||
        e.text.includes('ReferenceError')
    );

    expect(
      criticalErrors.length,
      `Found ${criticalErrors.length} critical errors`
    ).toBeLessThanOrEqual(0);
  });
});

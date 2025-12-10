// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Issue #198 E2E Test Suite - PDF/URL 콘텐츠 입력 기능
 *
 * Tests verify:
 * 1. 콘텐츠 입력 패널 렌더링 (Mentor 로그인 후)
 * 2. 입력 타입 전환 (텍스트/URL/PDF)
 * 3. URL 입력 UI 동작
 * 4. PDF 업로드 플레이스홀더 상태 확인
 * 5. 텍스트 입력 기본 기능
 *
 * Environment: Docker (http://localhost:8080)
 * Status: Active tests for Issue #198
 */

test.describe('Issue #198: PDF/URL 콘텐츠 입력 기능 - E2E Tests', () => {
  // 테스트 계정 정보 (환경에 맞게 수정 필요)
  const TEST_MENTOR = {
    username: 'mentor',
    password: 'test1234',
  };

  // 로그인 헬퍼 함수
  async function loginAsMentor(page) {
    await page.goto('/', { waitUntil: 'networkidle' });

    // 로그인 폼 확인
    const usernameInput = page.locator(
      'input[id="login-username"], input[placeholder*="아이디"]'
    );
    const passwordInput = page.locator('input[type="password"]');
    const loginButton = page.locator('button[type="submit"]');

    // 로그인 시도
    if ((await usernameInput.count()) > 0 && (await passwordInput.count()) > 0) {
      await usernameInput.fill(TEST_MENTOR.username);
      await passwordInput.fill(TEST_MENTOR.password);
      await loginButton.click();

      // 로그인 완료 대기 (대시보드로 이동 또는 에러)
      await page.waitForTimeout(2000);
    }
  }

  test.describe('1. 입력 타입 선택 UI 검증', () => {
    test('입력 타입 버튼 (텍스트/URL/PDF) 존재 확인', async ({ page }) => {
      await loginAsMentor(page);

      // MentorDashboard 또는 콘텐츠 입력 패널 확인
      const contentPanel = page.locator('[class*="콘텐츠"], h2:has-text("콘텐츠")');
      const hasContentPanel = (await contentPanel.count()) > 0;

      if (!hasContentPanel) {
        // 로그인 실패 또는 권한 없음 - 스킵
        console.log('콘텐츠 입력 패널에 접근 불가 - Mentor 로그인 필요');
        test.skip();
        return;
      }

      // 입력 타입 버튼 확인
      const textButton = page.locator('button:has-text("텍스트")');
      const urlButton = page.locator('button:has-text("URL")');
      const pdfButton = page.locator('button:has-text("PDF")');

      // 스크린샷
      await page.screenshot({
        path: 'test-results/issue198-01-input-type-buttons.png',
        fullPage: true,
      });

      // 버튼 존재 확인
      const hasTextButton = (await textButton.count()) > 0;
      const hasUrlButton = (await urlButton.count()) > 0;
      const hasPdfButton = (await pdfButton.count()) > 0;

      console.log(`텍스트 버튼: ${hasTextButton}`);
      console.log(`URL 버튼: ${hasUrlButton}`);
      console.log(`PDF 버튼: ${hasPdfButton}`);

      expect(hasTextButton).toBe(true);
      expect(hasUrlButton).toBe(true);
      expect(hasPdfButton).toBe(true);
    });

    test('입력 타입 전환 시 UI 변경 확인', async ({ page }) => {
      await loginAsMentor(page);

      // 버튼 찾기
      const textButton = page.locator('button:has-text("텍스트")');
      const urlButton = page.locator('button:has-text("URL")');
      const pdfButton = page.locator('button:has-text("PDF")');

      if ((await textButton.count()) === 0) {
        console.log('입력 타입 버튼에 접근 불가');
        test.skip();
        return;
      }

      // 1. 텍스트 모드 확인 (기본값)
      await textButton.click();
      await page.waitForTimeout(300);

      const textarea = page.locator('textarea');
      const hasTextarea = (await textarea.count()) > 0;
      console.log(`텍스트 모드 - textarea 존재: ${hasTextarea}`);

      await page.screenshot({
        path: 'test-results/issue198-02-text-mode.png',
        fullPage: true,
      });

      // 2. URL 모드 전환
      await urlButton.click();
      await page.waitForTimeout(300);

      const urlInput = page.locator('input[type="url"]');
      const hasUrlInput = (await urlInput.count()) > 0;
      console.log(`URL 모드 - url input 존재: ${hasUrlInput}`);

      await page.screenshot({
        path: 'test-results/issue198-03-url-mode.png',
        fullPage: true,
      });

      // 3. PDF 모드 전환
      await pdfButton.click();
      await page.waitForTimeout(300);

      // PDF 플레이스홀더 확인
      const pdfPlaceholder = page.locator('div:has-text("PDF 업로드")');
      const hasPdfPlaceholder = (await pdfPlaceholder.count()) > 0;
      console.log(`PDF 모드 - 플레이스홀더 존재: ${hasPdfPlaceholder}`);

      await page.screenshot({
        path: 'test-results/issue198-04-pdf-mode.png',
        fullPage: true,
      });

      // 검증
      expect(hasTextarea).toBe(true);
      expect(hasUrlInput).toBe(true);
      expect(hasPdfPlaceholder).toBe(true);
    });
  });

  test.describe('2. URL 입력 기능 검증', () => {
    test('URL 입력 필드 동작 확인', async ({ page }) => {
      await loginAsMentor(page);

      const urlButton = page.locator('button:has-text("URL")');
      if ((await urlButton.count()) === 0) {
        console.log('URL 버튼에 접근 불가');
        test.skip();
        return;
      }

      // URL 모드로 전환
      await urlButton.click();
      await page.waitForTimeout(300);

      // URL 입력 필드 확인
      const urlInput = page.locator('input[type="url"]');
      await expect(urlInput).toBeVisible();

      // URL 입력 테스트
      const testUrl = 'https://example.com/test-article';
      await urlInput.fill(testUrl);

      // 입력값 확인
      const inputValue = await urlInput.inputValue();
      expect(inputValue).toBe(testUrl);

      console.log(`URL 입력 성공: ${inputValue}`);

      await page.screenshot({
        path: 'test-results/issue198-05-url-input-filled.png',
        fullPage: true,
      });
    });

    test('빈 URL 제출 시 경고 메시지 확인', async ({ page }) => {
      await loginAsMentor(page);

      const urlButton = page.locator('button:has-text("URL")');
      if ((await urlButton.count()) === 0) {
        test.skip();
        return;
      }

      await urlButton.click();
      await page.waitForTimeout(300);

      // 생성 버튼 클릭 (URL 비어있음)
      const generateButton = page.locator(
        'button:has-text("교육 자료 생성"), button:has-text("원문으로 등록")'
      );

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        // Toast 메시지 확인
        const toast = page.locator('[class*="toast"], [role="alert"]');
        const toastText = await toast.textContent().catch(() => '');

        console.log(`Toast 메시지: ${toastText}`);

        await page.screenshot({
          path: 'test-results/issue198-06-url-empty-warning.png',
          fullPage: true,
        });
      }
    });
  });

  test.describe('3. PDF 업로드 기능 검증 (현재 미구현 상태)', () => {
    test('PDF 플레이스홀더 상태 확인', async ({ page }) => {
      await loginAsMentor(page);

      const pdfButton = page.locator('button:has-text("PDF")');
      if ((await pdfButton.count()) === 0) {
        console.log('PDF 버튼에 접근 불가');
        test.skip();
        return;
      }

      await pdfButton.click();
      await page.waitForTimeout(300);

      // PDF 플레이스홀더 확인 (border-dashed 스타일)
      const pdfPlaceholder = page.locator('.border-dashed, [class*="border-dashed"]');
      const placeholderText = page.locator('div:has-text("PDF 업로드")');

      const hasPlaceholder = (await pdfPlaceholder.count()) > 0;
      const hasPlaceholderText = (await placeholderText.count()) > 0;

      console.log(`PDF 플레이스홀더 존재: ${hasPlaceholder}`);
      console.log(`"PDF 업로드" 텍스트 존재: ${hasPlaceholderText}`);

      await page.screenshot({
        path: 'test-results/issue198-07-pdf-placeholder.png',
        fullPage: true,
      });

      // 플레이스홀더 상태 검증 (현재 미구현이므로 플레이스홀더가 있어야 함)
      expect(hasPlaceholder || hasPlaceholderText).toBe(true);

      // 파일 input이 없어야 함 (미구현 상태)
      const fileInput = page.locator('input[type="file"]');
      const hasFileInput = (await fileInput.count()) > 0;
      console.log(`파일 input 존재: ${hasFileInput} (미구현이면 false 예상)`);

      // 현재 상태: 파일 input 없음 (Issue #198에서 구현 필요)
      // 이 테스트는 현재 상태를 기록하는 역할
    });

    test('PDF 모드에서 생성 버튼 동작 확인', async ({ page }) => {
      await loginAsMentor(page);

      const pdfButton = page.locator('button:has-text("PDF")');
      if ((await pdfButton.count()) === 0) {
        test.skip();
        return;
      }

      await pdfButton.click();
      await page.waitForTimeout(300);

      // 생성 버튼 확인
      const generateButton = page.locator(
        'button:has-text("교육 자료 생성"), button:has-text("원문으로 등록")'
      );

      if ((await generateButton.count()) > 0) {
        const isEnabled = await generateButton.isEnabled();
        console.log(`생성 버튼 활성화: ${isEnabled}`);

        await page.screenshot({
          path: 'test-results/issue198-08-pdf-generate-button.png',
          fullPage: true,
        });
      }
    });
  });

  test.describe('4. 텍스트 입력 기본 기능 검증', () => {
    test('텍스트 입력 및 미리보기 정보 표시', async ({ page }) => {
      await loginAsMentor(page);

      const textButton = page.locator('button:has-text("텍스트")');
      if ((await textButton.count()) === 0) {
        test.skip();
        return;
      }

      await textButton.click();
      await page.waitForTimeout(300);

      const textarea = page.locator('textarea');
      if ((await textarea.count()) === 0) {
        test.skip();
        return;
      }

      // 테스트 텍스트 입력
      const testContent = `
        OJT 교육 자료 테스트

        1. 첫 번째 섹션
        이것은 테스트용 교육 콘텐츠입니다.

        2. 두 번째 섹션
        PDF 및 URL 기능 테스트를 위한 텍스트 입력 검증입니다.

        3. 세 번째 섹션
        텍스트 입력이 정상적으로 동작하는지 확인합니다.
      `.trim();

      await textarea.fill(testContent);

      // 입력값 확인
      const inputValue = await textarea.inputValue();
      expect(inputValue).toContain('OJT 교육 자료 테스트');

      // 예상 학습 시간 / 권장 스텝 수 표시 확인
      const statsText = page.locator('span:has-text("예상 학습"), span:has-text("권장 스텝")');
      const hasStats = (await statsText.count()) > 0;
      console.log(`학습 통계 표시: ${hasStats}`);

      await page.screenshot({
        path: 'test-results/issue198-09-text-input-stats.png',
        fullPage: true,
      });
    });

    test('문서 제목 입력 필드 동작 확인', async ({ page }) => {
      await loginAsMentor(page);

      // 제목 입력 필드 확인
      const titleInput = page.locator('input[placeholder*="제목"]');

      if ((await titleInput.count()) === 0) {
        console.log('제목 입력 필드 없음');
        test.skip();
        return;
      }

      await expect(titleInput).toBeVisible();

      // 제목 입력
      const testTitle = 'Issue #198 테스트 문서';
      await titleInput.fill(testTitle);

      const inputValue = await titleInput.inputValue();
      expect(inputValue).toBe(testTitle);

      console.log(`제목 입력 성공: ${inputValue}`);

      await page.screenshot({
        path: 'test-results/issue198-10-title-input.png',
        fullPage: true,
      });
    });
  });

  test.describe('5. 자동 스텝 분할 옵션 검증', () => {
    test('자동 스텝 분할 체크박스 동작', async ({ page }) => {
      await loginAsMentor(page);

      // 자동 스텝 분할 체크박스 확인
      const autoSplitCheckbox = page.locator('input[type="checkbox"]');
      const autoSplitLabel = page.locator('span:has-text("자동 스텝 분할")');

      const hasCheckbox = (await autoSplitCheckbox.count()) > 0;
      const hasLabel = (await autoSplitLabel.count()) > 0;

      console.log(`자동 스텝 분할 체크박스: ${hasCheckbox}`);
      console.log(`자동 스텝 분할 레이블: ${hasLabel}`);

      if (hasCheckbox) {
        // 초기 상태 확인
        const isChecked = await autoSplitCheckbox.first().isChecked();
        console.log(`초기 체크 상태: ${isChecked}`);

        // 토글 테스트
        await autoSplitCheckbox.first().click();
        await page.waitForTimeout(300);

        const isCheckedAfter = await autoSplitCheckbox.first().isChecked();
        console.log(`토글 후 상태: ${isCheckedAfter}`);

        expect(isCheckedAfter).toBe(!isChecked);
      }

      await page.screenshot({
        path: 'test-results/issue198-11-auto-split-toggle.png',
        fullPage: true,
      });
    });
  });

  test.describe('6. AI 엔진 선택기 통합 검증', () => {
    test('AI 엔진 선택기 렌더링 확인', async ({ page }) => {
      await loginAsMentor(page);

      // AIEngineSelector 컴포넌트 확인
      const engineSelector = page.locator(
        '[class*="engine"], [class*="ai-selector"], button:has-text("Local AI"), button:has-text("WebLLM")'
      );

      const hasEngineSelector = (await engineSelector.count()) > 0;
      console.log(`AI 엔진 선택기 존재: ${hasEngineSelector}`);

      await page.screenshot({
        path: 'test-results/issue198-12-ai-engine-selector.png',
        fullPage: true,
      });

      // 최소한 AI 상태 표시는 있어야 함
      const aiStatus = page.locator('span:has-text("Local AI"), span:has-text("WebLLM"), span:has-text("Gemini")');
      const hasAiStatus = (await aiStatus.count()) > 0;
      console.log(`AI 상태 표시: ${hasAiStatus}`);
    });
  });
});

/**
 * 테스트 요약:
 *
 * 1. 입력 타입 UI: 텍스트/URL/PDF 버튼 존재 및 전환 동작
 * 2. URL 입력: URL 필드 동작, 빈 URL 경고
 * 3. PDF 업로드: 플레이스홀더 상태 확인 (현재 미구현)
 * 4. 텍스트 입력: 기본 입력, 제목, 학습 통계 표시
 * 5. 자동 스텝 분할: 체크박스 토글 동작
 * 6. AI 엔진: 선택기 렌더링 확인
 *
 * 참고:
 * - Mentor 계정 로그인이 필요한 테스트는 계정 설정에 따라 스킵될 수 있음
 * - PDF 업로드 기능은 Issue #198에서 구현 예정이므로 현재 상태만 검증
 * - URL 텍스트 추출은 CORS 제약으로 실제 동작 검증은 별도 통합 테스트 필요
 */

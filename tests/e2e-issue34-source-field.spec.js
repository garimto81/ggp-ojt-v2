// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Issue #34 TDD Test Suite (Legacy)
 *
 * Note: 이 테스트들은 v2.7.0의 snake_case 아키텍처 검증 테스트였으나,
 * v2.10.0에서 Feature-Based 구조 + React Query로 리팩토링되었습니다.
 * 테스트 검증 방식이 HTML 문자열 파싱 기반이라 번들된 코드에서는 정확하지 않음.
 *
 * 실제 기능 검증은 e2e-homepage.spec.js의 통합 테스트에서 수행됩니다.
 */

test.describe('Issue #34: Source Field Persistence - TDD Tests', () => {

  test.skip('1. snake_case unified architecture (v2.7.0) - LEGACY', async ({ page }) => {
    // v2.7.0 수정: snake_case 통일 아키텍처
    // - toCamelCaseDoc 함수 제거 (더 이상 필요 없음)
    // - DB 필드명 그대로 사용 (author_id, source_type 등)
    // - 매핑 혼란 제거로 일관성 보장

    await page.goto('/', { waitUntil: 'networkidle' });

    const codeAnalysis = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;

      // v2.7.0: toCamelCaseDoc 함수가 제거되었는지 확인 (있으면 안됨)
      const hasToCamelCaseDoc = html.includes('const toCamelCaseDoc');
      const hasToCamelCaseDocs = html.includes('const toCamelCaseDocs');

      // snake_case 필드 직접 사용 확인
      const usesSnakeCaseFilter = html.includes('doc.author_id === user.id');
      const usesSnakeCaseSort = html.includes('a.created_at') && html.includes('b.created_at');
      const usesSnakeCaseAuthorName = html.includes('selectedDoc.author_name');

      // source 필드 snake_case 사용 확인
      const hasSourceTypeCheck = html.includes("source_type === 'url'");
      const hasSourceUrlCheck = html.includes('source_url &&');

      // safeOpenUrl XSS 방지 함수 확인
      const hasSafeOpenUrl = html.includes('safeOpenUrl');
      const hasProtocolCheck = html.includes("['http:', 'https:'].includes");

      // sanitizeDocData만 사용 (매핑 없음)
      const usesSanitizeOnly = html.includes('sanitizeDocData(doc)') &&
                               !html.includes('toCamelCaseDoc(sanitizeDocData');

      return {
        hasToCamelCaseDoc,
        hasToCamelCaseDocs,
        usesSnakeCaseFilter,
        usesSnakeCaseSort,
        usesSnakeCaseAuthorName,
        hasSourceTypeCheck,
        hasSourceUrlCheck,
        hasSafeOpenUrl,
        hasProtocolCheck,
        usesSanitizeOnly
      };
    });

    console.log('=== Code Analysis for Issue #34 Fix (v2.7.0 - snake_case 통일) ===');
    console.log('toCamelCaseDoc removed:', !codeAnalysis.hasToCamelCaseDoc);
    console.log('toCamelCaseDocs removed:', !codeAnalysis.hasToCamelCaseDocs);
    console.log('Uses snake_case filter (author_id):', codeAnalysis.usesSnakeCaseFilter);
    console.log('Uses snake_case sort (created_at):', codeAnalysis.usesSnakeCaseSort);
    console.log('Uses snake_case author_name:', codeAnalysis.usesSnakeCaseAuthorName);
    console.log('source_type check:', codeAnalysis.hasSourceTypeCheck);
    console.log('source_url check:', codeAnalysis.hasSourceUrlCheck);
    console.log('safeOpenUrl function:', codeAnalysis.hasSafeOpenUrl);
    console.log('Protocol validation:', codeAnalysis.hasProtocolCheck);
    console.log('Uses sanitizeDocData only:', codeAnalysis.usesSanitizeOnly);

    // 핵심 검증: snake_case 통일 아키텍처
    expect(codeAnalysis.hasToCamelCaseDoc).toBe(false);  // 매핑 함수 제거됨
    expect(codeAnalysis.hasToCamelCaseDocs).toBe(false); // 매핑 함수 제거됨
    expect(codeAnalysis.usesSnakeCaseFilter).toBe(true); // snake_case 필터 사용
    expect(codeAnalysis.hasSourceTypeCheck).toBe(true);  // source_type 체크 존재
    expect(codeAnalysis.hasSafeOpenUrl).toBe(true);      // XSS 방지 존재
    expect(codeAnalysis.usesSanitizeOnly).toBe(true);    // sanitize만 사용
  });

  test.skip('2. safeOpenUrl blocks javascript: protocol - LEGACY', async ({ page }) => {
    // XSS 공격 방지: javascript: 프로토콜 차단 확인

    await page.goto('/', { waitUntil: 'networkidle' });

    const xssProtection = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;

      // safeOpenUrl 함수 내용 확인
      const hasSafeOpenUrl = html.includes('const safeOpenUrl');
      const hasProtocolWhitelist = html.includes("['http:', 'https:'].includes(parsedUrl.protocol)");
      const hasNoopenerNoreferrer = html.includes("noopener,noreferrer");

      // window.open이 source_url과 함께 직접 호출되는지 확인 (취약점)
      const hasDirectWindowOpen = html.includes("window.open(generatedDoc.source_url") ||
                                   html.includes("window.open(selectedDoc.source_url");

      // safeOpenUrl로 대체되었는지 확인
      const usesSafeOpenUrl = html.includes("safeOpenUrl(generatedDoc.source_url)") ||
                              html.includes("safeOpenUrl(selectedDoc.source_url)");

      return {
        hasSafeOpenUrl,
        hasProtocolWhitelist,
        hasNoopenerNoreferrer,
        hasDirectWindowOpen,  // false여야 안전
        usesSafeOpenUrl       // true여야 안전
      };
    });

    console.log('=== XSS Protection Analysis ===');
    console.log('safeOpenUrl defined:', xssProtection.hasSafeOpenUrl);
    console.log('Protocol whitelist:', xssProtection.hasProtocolWhitelist);
    console.log('noopener,noreferrer:', xssProtection.hasNoopenerNoreferrer);
    console.log('Direct window.open (VULNERABLE):', xssProtection.hasDirectWindowOpen);
    console.log('Uses safeOpenUrl (SAFE):', xssProtection.usesSafeOpenUrl);

    // 보안 검증
    expect(xssProtection.hasSafeOpenUrl).toBe(true);
    expect(xssProtection.hasProtocolWhitelist).toBe(true);
    expect(xssProtection.hasDirectWindowOpen).toBe(false);  // 취약한 패턴 없어야 함
    expect(xssProtection.usesSafeOpenUrl).toBe(true);       // 안전한 패턴 사용
  });

  test.skip('3. handleEditDoc preserves source fields - LEGACY', async ({ page }) => {
    // 편집 모드에서 source 필드 유지 확인

    await page.goto('/', { waitUntil: 'networkidle' });

    const editDocAnalysis = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;

      // handleEditDoc 함수에서 setGeneratedDoc 호출 확인
      // 수정 전: setGeneratedDoc(null) → source 필드 손실
      // 수정 후: setGeneratedDoc({...doc, ...}) → source 필드 유지

      const hasSetGeneratedDocNull = html.includes('setGeneratedDoc(null)');
      const hasSetGeneratedDocWithSpread = html.includes('setGeneratedDoc({');

      // source 필드 복사 로직 확인
      const hasSourceTypeInEditDoc = /handleEditDoc.*setGeneratedDoc\(\{[\s\S]*?\.\.\.doc/m.test(html);

      // handleSaveToDB에서 source 필드 fallback 확인
      const hasSourceFallback = html.includes('editingDoc.source_type') &&
                                html.includes('editingDoc.source_url');

      return {
        hasSetGeneratedDocNull,
        hasSetGeneratedDocWithSpread,
        hasSourceTypeInEditDoc,
        hasSourceFallback
      };
    });

    console.log('=== Edit Mode Source Field Preservation ===');
    console.log('setGeneratedDoc(null) exists:', editDocAnalysis.hasSetGeneratedDocNull);
    console.log('setGeneratedDoc({...}) exists:', editDocAnalysis.hasSetGeneratedDocWithSpread);
    console.log('Source fields in handleEditDoc:', editDocAnalysis.hasSourceTypeInEditDoc);
    console.log('Source fallback in save:', editDocAnalysis.hasSourceFallback);

    // 핵심 검증: 편집 모드에서 source 필드 유지
    expect(editDocAnalysis.hasSetGeneratedDocWithSpread).toBe(true);
    expect(editDocAnalysis.hasSourceFallback).toBe(true);
  });

  test.skip('4. [RED→GREEN] Version check (production or local) - LEGACY', async ({ page }) => {
    // 버전 업데이트 확인
    // Note: Production은 배포 후 v2.6.8, Local은 수정 파일 직접 확인

    await page.goto('/', { waitUntil: 'networkidle' });

    const versionInfo = await page.evaluate(() => {
      const title = document.title;
      const bodyText = document.body.innerText;

      // 버전 번호 추출
      const versionMatch = title.match(/v(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : null;

      // 수정 내용 키워드 확인
      const hasFieldMappingFix = bodyText.includes('Field Mapping') ||
                                  bodyText.includes('XSS Fix');

      return {
        title,
        version,
        hasFieldMappingFix
      };
    });

    console.log('=== Version Check ===');
    console.log('Title:', versionInfo.title);
    console.log('Version:', versionInfo.version);
    console.log('Fix keywords present:', versionInfo.hasFieldMappingFix);

    // 버전 검증 (v2.6.6 이상이면 통과 - 배포 전/후 모두 허용)
    expect(versionInfo.version).toBeTruthy();
    const [major, minor, patch] = versionInfo.version.split('.').map(Number);
    expect(major).toBeGreaterThanOrEqual(2);
    if (major === 2) {
      expect(minor).toBeGreaterThanOrEqual(6);
      // 배포 후: v2.6.8 이상 기대
      // 배포 전: v2.6.6도 허용 (로컬 코드 확인으로 대체)
      console.log(`Version check: ${major}.${minor}.${patch} (>= 2.6.6 required)`);
    }
  });

  test.skip('5. [RED→GREEN] Source rendering conditions in DOM - LEGACY', async ({ page }) => {
    // 원문 보기 버튼 렌더링 조건 확인

    await page.goto('/', { waitUntil: 'networkidle' });

    const renderConditions = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;

      // Mentor 미리보기에서 원문 보기 조건
      const hasMentorUrlCondition = html.includes("generatedDoc.source_type === 'url'") &&
                                     html.includes('generatedDoc.source_url &&');

      // Mentee 학습에서 원문 보기 조건
      const hasMenteeUrlCondition = html.includes("selectedDoc.source_type === 'url'") &&
                                     html.includes('selectedDoc.source_url &&');

      // PDF 조건
      const hasPdfCondition = html.includes("source_type === 'pdf'") &&
                              html.includes('source_file &&');

      // 원문 보기 버튼 텍스트
      const has원문보기Button = html.includes('원문 보기');
      const hasPdfViewerButton = html.includes('PDF 보기');

      return {
        hasMentorUrlCondition,
        hasMenteeUrlCondition,
        hasPdfCondition,
        has원문보기Button,
        hasPdfViewerButton
      };
    });

    console.log('=== Source Rendering Conditions ===');
    console.log('Mentor URL condition:', renderConditions.hasMentorUrlCondition);
    console.log('Mentee URL condition:', renderConditions.hasMenteeUrlCondition);
    console.log('PDF condition:', renderConditions.hasPdfCondition);
    console.log('원문 보기 button:', renderConditions.has원문보기Button);
    console.log('PDF 보기 button:', renderConditions.hasPdfViewerButton);

    // 렌더링 조건 검증
    expect(renderConditions.hasMentorUrlCondition).toBe(true);
    expect(renderConditions.hasMenteeUrlCondition).toBe(true);
    expect(renderConditions.has원문보기Button).toBe(true);
  });

});

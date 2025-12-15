/**
 * Context Quiz Agent - URL Context 단위 테스트
 * @agent context-quiz-agent
 * @blocks ai.quiz.url.test
 * @issue #200 - Context API 기반 퀴즈 생성
 */

import { describe, it, expect } from 'vitest';

import { extractTitleFromUrl } from '../url-context';

describe('extractTitleFromUrl', () => {
  it('URL 경로에서 제목을 추출한다', () => {
    expect(extractTitleFromUrl('https://example.com/my-article')).toBe('my article');
    expect(extractTitleFromUrl('https://example.com/blog/react-hooks-guide')).toBe(
      'react hooks guide'
    );
  });

  it('경로의 마지막 부분을 제목으로 사용한다', () => {
    expect(extractTitleFromUrl('https://example.com/docs/getting-started/installation')).toBe(
      'installation'
    );
  });

  it('하이픈과 언더스코어를 공백으로 변환한다', () => {
    expect(extractTitleFromUrl('https://example.com/my_article_title')).toBe('my article title');
    expect(extractTitleFromUrl('https://example.com/my-article-title')).toBe('my article title');
  });

  it('파일 확장자를 제거한다', () => {
    expect(extractTitleFromUrl('https://example.com/document.html')).toBe('document');
    expect(extractTitleFromUrl('https://example.com/report.pdf')).toBe('report');
  });

  it('경로가 없으면 호스트명을 반환한다', () => {
    expect(extractTitleFromUrl('https://example.com/')).toBe('example.com');
    expect(extractTitleFromUrl('https://blog.example.com/')).toBe('blog.example.com');
  });

  it('URL 인코딩된 경로를 디코딩한다', () => {
    expect(extractTitleFromUrl('https://example.com/%ED%95%9C%EA%B8%80%EB%AC%B8%EC%84%9C')).toBe(
      '한글문서'
    );
  });

  it('잘못된 URL은 기본값을 반환한다', () => {
    expect(extractTitleFromUrl('not-a-valid-url')).toBe('URL 문서');
    expect(extractTitleFromUrl('')).toBe('URL 문서');
  });
});

// Note: generateQuizFromUrl은 실제 API 호출이 필요하므로
// 통합 테스트 또는 E2E 테스트에서 검증합니다.

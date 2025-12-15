/**
 * Context Quiz Agent - File Upload 단위 테스트
 * @agent context-quiz-agent
 * @blocks ai.quiz.upload.test
 * @issue #200 - Context API 기반 퀴즈 생성
 */

import { describe, it, expect } from 'vitest';

import { isPdf, isPdfUrl, SUPPORTED_MIME_TYPES } from '../file-upload';

describe('SUPPORTED_MIME_TYPES', () => {
  it('PDF MIME 타입이 정의되어 있다', () => {
    expect(SUPPORTED_MIME_TYPES.PDF).toBe('application/pdf');
  });

  it('이미지 MIME 타입이 정의되어 있다', () => {
    expect(SUPPORTED_MIME_TYPES.PNG).toBe('image/png');
    expect(SUPPORTED_MIME_TYPES.JPEG).toBe('image/jpeg');
    expect(SUPPORTED_MIME_TYPES.WEBP).toBe('image/webp');
  });

  it('텍스트 MIME 타입이 정의되어 있다', () => {
    expect(SUPPORTED_MIME_TYPES.TEXT).toBe('text/plain');
    expect(SUPPORTED_MIME_TYPES.HTML).toBe('text/html');
    expect(SUPPORTED_MIME_TYPES.CSV).toBe('text/csv');
    expect(SUPPORTED_MIME_TYPES.JSON).toBe('application/json');
  });
});

describe('isPdf', () => {
  it('PDF MIME 타입의 File 객체를 감지한다', () => {
    const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    expect(isPdf(pdfFile)).toBe(true);
  });

  it('.pdf 확장자의 File 객체를 감지한다', () => {
    const pdfFile = new File(['content'], 'document.PDF', { type: '' });
    expect(isPdf(pdfFile)).toBe(true);
  });

  it('PDF가 아닌 파일은 false를 반환한다', () => {
    const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    expect(isPdf(txtFile)).toBe(false);
  });

  it('PDF URL 문자열을 감지한다', () => {
    expect(isPdf('https://example.com/document.pdf')).toBe(true);
    expect(isPdf('/path/to/file.PDF')).toBe(true);
  });

  it('PDF가 아닌 URL은 false를 반환한다', () => {
    expect(isPdf('https://example.com/page.html')).toBe(false);
    expect(isPdf('/path/to/file.doc')).toBe(false);
  });
});

describe('isPdfUrl', () => {
  it('유효한 PDF URL을 감지한다', () => {
    expect(isPdfUrl('https://example.com/document.pdf')).toBe(true);
    expect(isPdfUrl('http://example.com/path/to/file.PDF')).toBe(true);
    expect(isPdfUrl('https://cdn.example.com/assets/report.pdf')).toBe(true);
  });

  it('PDF가 아닌 URL은 false를 반환한다', () => {
    expect(isPdfUrl('https://example.com/page.html')).toBe(false);
    expect(isPdfUrl('https://example.com/image.png')).toBe(false);
    expect(isPdfUrl('https://example.com/')).toBe(false);
  });

  it('잘못된 입력에 대해 false를 반환한다', () => {
    expect(isPdfUrl(null)).toBe(false);
    expect(isPdfUrl(undefined)).toBe(false);
    expect(isPdfUrl('')).toBe(false);
    expect(isPdfUrl(123)).toBe(false);
  });

  it('쿼리 스트링이 있는 PDF URL도 감지한다', () => {
    // URL 객체가 pathname을 추출하므로 쿼리 스트링은 무시됨
    expect(isPdfUrl('https://example.com/doc.pdf?token=abc')).toBe(true);
  });

  it('잘못된 URL 형식도 확장자로 체크한다', () => {
    // URL 파싱 실패 시 단순 문자열 체크
    expect(isPdfUrl('not-a-url.pdf')).toBe(true);
  });
});

// OJT Master - CORS Proxy Client Unit Tests
// PRD-0008: cors-proxy.js 테스트

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractUrlContent, fetchUrlMetadata, checkProxyStatus } from './cors-proxy';

// Mock constants
vi.mock('../constants', () => ({
  CORS_CONFIG: {
    WORKER_PROXY: 'https://test-worker.example.com/proxy',
    FALLBACK_PROXIES: [
      'https://fallback1.example.com/?url=',
      'https://fallback2.example.com/?url=',
    ],
    TIMEOUT: 5000,
  },
  CONFIG: {
    MAX_URL_EXTRACT_CHARS: 1000,
  },
}));

describe('cors-proxy', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractUrlContent', () => {
    it('Worker 프록시 성공 시 콘텐츠 추출', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>테스트 페이지</title>
          <meta property="og:description" content="OG 설명입니다">
          <meta property="og:image" content="https://example.com/image.jpg">
        </head>
        <body>
          <p>본문 내용입니다.</p>
        </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await extractUrlContent('https://example.com');

      expect(result.title).toBe('테스트 페이지');
      expect(result.description).toBe('OG 설명입니다');
      expect(result.image).toBe('https://example.com/image.jpg');
      expect(result.proxyUsed).toBe('worker');
      expect(result.text).toContain('본문 내용입니다');
    });

    it('Worker 실패 시 폴백 프록시 사용', async () => {
      const mockHtml = '<html><head><title>Fallback Test</title></head><body>Content</body></html>';

      // Worker 실패
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      // 첫 번째 폴백 성공
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await extractUrlContent('https://example.com');

      expect(result.title).toBe('Fallback Test');
      expect(result.proxyUsed).toBe('fallback');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('모든 프록시 실패 시 에러 발생', async () => {
      mockFetch.mockRejectedValue(new Error('All proxies failed'));

      await expect(extractUrlContent('https://example.com')).rejects.toThrow();
    });

    it('긴 텍스트는 잘림 처리', async () => {
      const longText = 'A'.repeat(2000);
      const mockHtml = `<html><body>${longText}</body></html>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await extractUrlContent('https://example.com');

      expect(result.wasTruncated).toBe(true);
      expect(result.extractedLength).toBe(1000);
      expect(result.originalLength).toBe(2000);
    });

    it('onProgress 콜백 호출', async () => {
      const mockHtml = '<html><body>Test</body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const onProgress = vi.fn();
      await extractUrlContent('https://example.com', { onProgress });

      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('fetchUrlMetadata', () => {
    it('메타데이터만 반환', async () => {
      const mockHtml = `
        <html>
        <head>
          <title>Meta Test</title>
          <meta property="og:site_name" content="Test Site">
        </head>
        <body>Long body content here...</body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await fetchUrlMetadata('https://example.com');

      expect(result.title).toBe('Meta Test');
      expect(result.siteName).toBe('Test Site');
      expect(result.url).toBe('https://example.com');
      // text 필드는 없음
      expect(result.text).toBeUndefined();
    });
  });

  describe('checkProxyStatus', () => {
    it('Worker 프록시 상태 확인', async () => {
      // Worker health 성공
      mockFetch.mockResolvedValueOnce({ ok: true });
      // Fallback 성공
      mockFetch.mockResolvedValueOnce({ ok: true });

      const status = await checkProxyStatus();

      expect(status.workerAvailable).toBe(true);
      expect(status.fallbackAvailable).toBe(true);
    });

    it('프록시 실패 시 false 반환', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const status = await checkProxyStatus();

      expect(status.workerAvailable).toBe(false);
      expect(status.fallbackAvailable).toBe(false);
    });
  });

  describe('HTML 파싱', () => {
    it('script/style 태그 제거', async () => {
      const mockHtml = `
        <html>
        <head><title>Clean Test</title></head>
        <body>
          <script>alert('xss')</script>
          <style>.hidden { display: none; }</style>
          <p>Clean content</p>
        </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await extractUrlContent('https://example.com');

      expect(result.text).not.toContain('alert');
      expect(result.text).not.toContain('display');
      expect(result.text).toContain('Clean content');
    });

    it('HTML 엔티티 디코딩', async () => {
      const mockHtml = '<html><body>&amp; &lt;test&gt; &quot;quoted&quot;</body></html>';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await extractUrlContent('https://example.com');

      expect(result.text).toContain('& <test> "quoted"');
    });
  });
});

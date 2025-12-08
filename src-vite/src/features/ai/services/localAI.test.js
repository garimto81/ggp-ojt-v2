// OJT Master - Local AI Service Tests (Issue #101)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LOCAL_AI_CONFIG,
  LOCAL_AI_STATUS,
  checkLocalAIAvailable,
  getLocalAIStatus,
  generateWithLocalAI,
  testLocalAIConnection,
} from './localAI';

describe('Local AI Service', () => {
  describe('LOCAL_AI_STATUS constants', () => {
    it('should have all required status values', () => {
      expect(LOCAL_AI_STATUS.NOT_CONFIGURED).toBe('not_configured');
      expect(LOCAL_AI_STATUS.CHECKING).toBe('checking');
      expect(LOCAL_AI_STATUS.AVAILABLE).toBe('available');
      expect(LOCAL_AI_STATUS.UNAVAILABLE).toBe('unavailable');
      expect(LOCAL_AI_STATUS.ERROR).toBe('error');
    });
  });

  describe('LOCAL_AI_CONFIG', () => {
    it('should have required configuration', () => {
      expect(LOCAL_AI_CONFIG.timeout).toBe(60000);
      expect(LOCAL_AI_CONFIG.model).toBe('Qwen/Qwen3-4B');
      expect(typeof LOCAL_AI_CONFIG.getBaseUrl).toBe('function');
    });

    it('getBaseUrl returns environment variable or null', () => {
      const url = LOCAL_AI_CONFIG.getBaseUrl();
      // URL이 설정되었거나 null이어야 함
      expect(url === null || typeof url === 'string').toBe(true);
    });
  });

  describe('checkLocalAIAvailable', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('returns boolean result', async () => {
      const result = await checkLocalAIAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('handles network errors gracefully', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await checkLocalAIAvailable();
      // URL이 설정되어 있으면 false, 없으면 false
      expect(result).toBe(false);
    });
  });

  describe('getLocalAIStatus', () => {
    it('returns status object with required fields', async () => {
      const result = await getLocalAIStatus();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('model');
      expect(typeof result.available).toBe('boolean');
    });

    it('returns valid status enum value', async () => {
      const result = await getLocalAIStatus();

      const validStatuses = Object.values(LOCAL_AI_STATUS);
      expect(validStatuses).toContain(result.status);
    });
  });

  describe('generateWithLocalAI - with server available', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      // Mock successful response
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  '{"sections": [{"title": "테스트", "content": "<p>내용</p>"}], "quiz": []}',
              },
            },
          ],
        }),
      });
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('sends correct request format', async () => {
      const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
      if (!baseUrl) {
        // URL 미설정 시 테스트 스킵
        return;
      }

      await generateWithLocalAI('테스트 프롬프트');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('returns generated content string', async () => {
      const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
      if (!baseUrl) {
        return;
      }

      const result = await generateWithLocalAI('테스트');

      expect(typeof result).toBe('string');
      expect(result).toContain('sections');
    });

    it('uses custom options when provided', async () => {
      const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
      if (!baseUrl) {
        return;
      }

      await generateWithLocalAI('테스트', {
        temperature: 0.7,
        maxTokens: 2048,
      });

      const callBody = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
      expect(callBody.temperature).toBe(0.7);
      expect(callBody.max_tokens).toBe(2048);
    });
  });

  describe('generateWithLocalAI - error handling', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('throws error when response is not ok', async () => {
      const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
      if (!baseUrl) {
        return;
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: 'Internal Server Error' },
        }),
      });

      await expect(generateWithLocalAI('test')).rejects.toThrow();
    });

    it('throws error when response has no content', async () => {
      const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
      if (!baseUrl) {
        return;
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] }),
      });

      await expect(generateWithLocalAI('test')).rejects.toThrow('응답에 콘텐츠가 없습니다.');
    });

    it('handles network error gracefully', async () => {
      const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
      if (!baseUrl) {
        return;
      }

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(generateWithLocalAI('test')).rejects.toThrow();
    });
  });

  describe('testLocalAIConnection', () => {
    it('returns result object with success field', async () => {
      const result = await testLocalAIConnection();

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');

      if (!result.success) {
        expect(result).toHaveProperty('error');
      }
    });
  });

  // Integration test - 실제 서버 연결 테스트 (환경변수 설정 시만 실행)
  describe('Integration: Real Server Connection', () => {
    const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();

    it.skipIf(!baseUrl)('connects to real Local AI server', async () => {
      const result = await getLocalAIStatus();

      console.log('[Test] Local AI Status:', result);

      if (result.status === LOCAL_AI_STATUS.AVAILABLE) {
        expect(result.available).toBe(true);
        expect(result.url).toBeTruthy();
        expect(result.model).toBeTruthy();
      }
    });

    it.skipIf(!baseUrl)('generates content from real server', async () => {
      const status = await getLocalAIStatus();
      if (status.status !== LOCAL_AI_STATUS.AVAILABLE) {
        console.log('[Test] Server not available, skipping');
        return;
      }

      const result = await generateWithLocalAI('안녕하세요. 간단히 응답해주세요.', {
        maxTokens: 50,
        timeout: 30000,
      });

      console.log('[Test] Generated response:', result.substring(0, 100));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it.skipIf(!baseUrl)('runs full connection test', async () => {
      const result = await testLocalAIConnection();

      console.log('[Test] Connection test result:', result);

      // 서버가 켜져있으면 성공, 아니면 에러 메시지 확인
      if (result.success) {
        expect(result.url).toBeTruthy();
        expect(result.model).toBeTruthy();
      } else {
        expect(result.error).toBeTruthy();
      }
    });
  });
});

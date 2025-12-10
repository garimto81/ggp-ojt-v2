/**
 * Gemini Agent - Client Tests
 * @agent gemini-agent
 * @description API 클라이언트 및 Rate Limiting 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { delay, calculateBackoff, generateOJTContent, checkStatus, getConfig } from './client';

// fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

// console.warn mock
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  vi.clearAllMocks();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

describe('delay', () => {
  it('지정된 시간만큼 대기해야 함', async () => {
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45); // 약간의 오차 허용
  });
});

describe('calculateBackoff', () => {
  it('첫 번째 시도는 1000ms를 반환해야 함', () => {
    expect(calculateBackoff(0)).toBe(1000);
  });

  it('두 번째 시도는 2000ms를 반환해야 함', () => {
    expect(calculateBackoff(1)).toBe(2000);
  });

  it('세 번째 시도는 4000ms를 반환해야 함', () => {
    expect(calculateBackoff(2)).toBe(4000);
  });

  it('exponential 증가 패턴을 따라야 함', () => {
    expect(calculateBackoff(3)).toBe(8000);
    expect(calculateBackoff(4)).toBe(16000);
  });
});

describe('getConfig', () => {
  it('설정 정보를 반환해야 함', () => {
    const config = getConfig();
    expect(config).toHaveProperty('model');
    expect(config).toHaveProperty('apiUrl');
    expect(config).toHaveProperty('hasApiKey');
    expect(typeof config.hasApiKey).toBe('boolean');
  });
});

describe('checkStatus', () => {
  it('API 성공 시 online: true를 반환해야 함', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        }),
    });

    const status = await checkStatus();
    expect(status.online).toBe(true);
    expect(status).toHaveProperty('model');
    expect(status).toHaveProperty('latency');
    expect(typeof status.latency).toBe('number');
  });

  it('API 실패 시 online: false를 반환해야 함', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const status = await checkStatus();
    expect(status.online).toBe(false);
    expect(status).toHaveProperty('error');
  });
});

describe('generateOJTContent - Rate Limiting', () => {
  it('정상 응답 시 콘텐츠를 반환해야 함', async () => {
    const mockResponse = {
      title: '테스트 문서',
      team: '개발팀',
      sections: [{ title: '학습 목표', content: '<p>테스트 내용입니다.</p>' }],
      quiz: [
        {
          question: '다음 중 올바른 것은 무엇인가요?',
          options: ['A', 'B', 'C', 'D'],
          correct: 0,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockResponse) }] } }],
        }),
    });

    const result = await generateOJTContent({
      contentText: '테스트 텍스트',
      title: '테스트 문서',
    });

    expect(result.title).toBe('테스트 문서');
    expect(result.ai_engine).toBe('gemini');
  });

  it('429 응답 시 재시도해야 함', async () => {
    // 첫 번째: 429, 두 번째: 성공
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: { message: 'Rate limit' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        title: '테스트',
                        team: '팀',
                        sections: [{ title: '섹션', content: '<p>내용</p>' }],
                        quiz: [],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
      });

    // delay를 빠르게 처리하기 위해 타이머 mock
    vi.useFakeTimers();

    const promise = generateOJTContent({
      contentText: '테스트',
      title: '테스트',
      options: { maxRetries: 1, quizCount: 0 },
    });

    // 타이머 진행
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result.title).toBe('테스트');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('최대 재시도 후 실패해야 함', async () => {
    // 모든 요청이 429 (json 메서드 포함)
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } }),
    });

    vi.useFakeTimers();

    let caughtError;
    const promise = generateOJTContent({
      contentText: '테스트',
      title: '테스트',
      options: { maxRetries: 2 },
    }).catch((err) => {
      caughtError = err;
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(caughtError).toBeDefined();
    expect(caughtError.message).toContain('Gemini API 오류: 429');
    // 초기 시도 + 2번 재시도 = 3번
    expect(mockFetch).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it('503 에러도 재시도해야 함', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: { message: 'Service unavailable' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        title: '테스트',
                        team: '팀',
                        sections: [],
                        quiz: [],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
      });

    vi.useFakeTimers();

    const promise = generateOJTContent({
      contentText: '테스트',
      title: '테스트',
      options: { maxRetries: 1, quizCount: 0 },
    });

    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('400 에러는 재시도하지 않아야 함', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: 'Bad request' } }),
    });

    await expect(
      generateOJTContent({
        contentText: '테스트',
        title: '테스트',
      })
    ).rejects.toThrow('Gemini API 오류: 400');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('빈 응답 시 에러를 던져야 함', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    });

    await expect(
      generateOJTContent({
        contentText: '테스트',
        title: '테스트',
      })
    ).rejects.toThrow('AI 응답이 비어있습니다');
  });

  it('진행률 콜백이 호출되어야 함', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: '테스트',
                      team: '팀',
                      sections: [],
                      quiz: [],
                    }),
                  },
                ],
              },
            },
          ],
        }),
    });

    const onProgress = vi.fn();

    await generateOJTContent({
      contentText: '테스트',
      title: '테스트',
      onProgress,
      options: { quizCount: 0 },
    });

    expect(onProgress).toHaveBeenCalledWith('AI 분석 중 (Gemini)...');
  });
});

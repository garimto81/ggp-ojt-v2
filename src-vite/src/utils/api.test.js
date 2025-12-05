// OJT Master v2.5.0 - API Utilities Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateQuizQuality, generateOJTContent, checkAIStatus } from './api';

describe('validateQuizQuality', () => {
  it('returns valid for well-formed quiz questions', () => {
    const quiz = [
      {
        question: '다음 중 올바른 것은 무엇입니까?',
        options: ['정답', '오답1', '오답2', '오답3'],
        correct: 0,
      },
      {
        question: '두 번째 문제입니다. 정답을 고르세요.',
        options: ['A', 'B', 'C', 'D'],
        correct: 1,
      },
    ];

    const result = validateQuizQuality(quiz);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.stats.total).toBe(2);
    expect(result.stats.validCount).toBe(2);
  });

  it('detects placeholder questions', () => {
    const quiz = [
      {
        question: '[자동 생성] 테스트 관련 문제 1',
        options: ['정답', '오답 1', '오답 2', '오답 3'],
        correct: 0,
        isPlaceholder: true,
      },
    ];

    const result = validateQuizQuality(quiz);
    expect(result.valid).toBe(false);
    expect(result.stats.placeholders).toBe(1);
    expect(result.issues.some((i) => i.includes('자동 생성'))).toBe(true);
  });

  it('detects short questions', () => {
    const quiz = [
      {
        question: '짧은문제',
        options: ['A', 'B', 'C', 'D'],
        correct: 0,
      },
    ];

    const result = validateQuizQuality(quiz);
    expect(result.valid).toBe(false);
    expect(result.stats.shortQuestions).toBe(1);
  });

  it('detects duplicate questions', () => {
    const quiz = [
      {
        question: '중복된 문제입니다.',
        options: ['A', 'B', 'C', 'D'],
        correct: 0,
      },
      {
        question: '중복된 문제입니다.',
        options: ['A', 'B', 'C', 'D'],
        correct: 1,
      },
    ];

    const result = validateQuizQuality(quiz);
    expect(result.valid).toBe(false);
    expect(result.stats.duplicates).toBe(1);
  });

  it('handles empty quiz array', () => {
    const result = validateQuizQuality([]);
    expect(result.valid).toBe(true);
    expect(result.stats.total).toBe(0);
  });

  it('handles null/undefined quiz', () => {
    const result = validateQuizQuality(null);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('퀴즈 데이터가 없습니다.');
  });

  it('detects duplicate options within a question', () => {
    const quiz = [
      {
        question: '중복 선택지가 있는 문제입니다.',
        options: ['같은답', '같은답', 'C', 'D'],
        correct: 0,
      },
    ];

    const result = validateQuizQuality(quiz);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('중복된 선택지'))).toBe(true);
  });
});

describe('generateOJTContent - Graceful Degradation (WebLLM Only)', () => {
  // WebLLM 전용: fetch mock 대신 WebLLM 미로드 상태에서 fallback 동작 테스트

  it('returns fallback content when WebLLM is not loaded', async () => {
    // WebLLM이 로드되지 않은 상태에서 테스트
    const result = await generateOJTContent(
      '테스트 콘텐츠 내용입니다. 이것은 원문 텍스트입니다.',
      '테스트 문서'
    );

    // Should return fallback structure
    expect(result.ai_processed).toBe(false);
    expect(result.ai_error).toContain('WebLLM');
    expect(result.title).toBe('테스트 문서');
    expect(result.team).toBe('미분류');
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe('원문 내용');
    expect(result.quiz).toEqual([]);
  });

  it('sanitizes HTML content in fallback mode', async () => {
    const maliciousContent = '<script>alert("xss")</script><p>정상 콘텐츠</p>';
    const result = await generateOJTContent(maliciousContent, '테스트');

    // Script tags should be removed
    expect(result.sections[0].content).not.toContain('<script>');
    expect(result.sections[0].content).toContain('정상 콘텐츠');
  });

  it('converts plain text to HTML paragraphs in fallback mode', async () => {
    const plainText = '첫 번째 문단\n\n두 번째 문단';
    const result = await generateOJTContent(plainText, '테스트');

    expect(result.sections[0].content).toContain('<p>');
    expect(result.sections[0].content).toContain('첫 번째 문단');
    expect(result.sections[0].content).toContain('두 번째 문단');
  });

  it('uses default title when not provided', async () => {
    const result = await generateOJTContent('콘텐츠', '');

    expect(result.title).toBe('제목 없음');
  });

  it('calls onProgress callback with fallback message when WebLLM fails', async () => {
    const onProgress = vi.fn();
    await generateOJTContent('콘텐츠', '테스트', 1, 1, onProgress);

    // WebLLM 미로드 상태에서는 fallback 메시지만 호출
    expect(onProgress).toHaveBeenCalledWith('AI 분석 실패 - 원문으로 등록 중...');
  });
});

describe('checkAIStatus (WebLLM Only)', () => {
  // WebLLM 전용: WebGPU 지원 및 WebLLM 상태 확인

  it('returns WebLLM status structure', async () => {
    const result = await checkAIStatus();

    // 필수 필드 존재 확인
    expect(result).toHaveProperty('online');
    expect(result).toHaveProperty('model');
    expect(result).toHaveProperty('loaded');
    expect(result).toHaveProperty('loading');
    expect(result).toHaveProperty('progress');
    expect(result).toHaveProperty('webgpuSupported');
  });

  it('returns online based on WebGPU support', async () => {
    const result = await checkAIStatus();

    // jsdom 환경에서 WebGPU는 지원되지 않음
    expect(result.webgpuSupported).toBe(false);
    expect(result.online).toBe(false);
  });

  it('returns loaded: false when WebLLM is not initialized', async () => {
    const result = await checkAIStatus();

    expect(result.loaded).toBe(false);
    expect(result.loading).toBe(false);
  });
});

// OJT Master v2.13.5 - API Utilities Tests (Local AI + WebLLM)
import { describe, it, expect, vi } from 'vitest';
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

describe('checkAIStatus (Local AI + WebLLM)', () => {
  // Local AI 우선, WebLLM fallback 구조

  it('returns AI status structure with required fields', async () => {
    const result = await checkAIStatus();

    // 필수 필드 존재 확인 (새로운 구조)
    expect(result).toHaveProperty('supported');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('ready');
    expect(result).toHaveProperty('engine');
    expect(result).toHaveProperty('model');
  });

  it('returns valid engine type', async () => {
    const result = await checkAIStatus();

    // engine은 'localai', 'webllm', 또는 null
    const validEngines = ['localai', 'webllm', null];
    expect(validEngines).toContain(result.engine);
  });

  it('returns valid status value', async () => {
    const result = await checkAIStatus();

    // status 값 검증
    const validStatuses = ['available', 'ready', 'not_loaded', null];
    expect(validStatuses).toContain(result.status);
  });

  it('returns boolean for supported and ready', async () => {
    const result = await checkAIStatus();

    expect(typeof result.supported).toBe('boolean');
    expect(typeof result.ready).toBe('boolean');
  });

  it('has consistent ready and status values', async () => {
    const result = await checkAIStatus();

    // ready가 true면 status는 'available' 또는 'ready'
    if (result.ready) {
      expect(['available', 'ready']).toContain(result.status);
    }
    // ready가 false면 engine이 null이거나 status가 'not_loaded'
    if (!result.ready) {
      expect(result.engine === null || result.status === 'not_loaded').toBe(true);
    }
  });
});

describe('generateOJTContent - Function Signature', () => {
  // generateOJTContent 함수 시그니처 및 기본 동작 테스트
  // 실제 AI 생성 테스트는 localAI.test.js의 Integration 테스트에서 수행

  it('is a function that accepts contentText and title', () => {
    expect(typeof generateOJTContent).toBe('function');
    expect(generateOJTContent.length).toBeGreaterThanOrEqual(2);
  });

  it('returns a promise', () => {
    const result = generateOJTContent('test', 'test');
    expect(result).toBeInstanceOf(Promise);
    // 테스트 후 정리 (Promise는 실행되지만 결과는 기다리지 않음)
  });
});

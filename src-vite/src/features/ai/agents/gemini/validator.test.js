/**
 * Gemini Agent - Validator Tests
 * @agent gemini-agent
 */

import { describe, it, expect } from 'vitest';
import { validateQuizQuality, validateSections, validateOJTContent } from './validator';

describe('validateQuizQuality', () => {
  it('유효한 퀴즈는 valid: true를 반환해야 함', () => {
    const quiz = [
      { question: '다음 중 올바른 것은 무엇인가요?', options: ['A', 'B', 'C', 'D'], correct: 0 },
      { question: '어떤 것이 가장 적합한가요?', options: ['옵션1', '옵션2', '옵션3', '옵션4'], correct: 2 },
    ];

    const result = validateQuizQuality(quiz);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('플레이스홀더 문제를 감지해야 함', () => {
    const quiz = [
      { question: '[자동 생성] 문제 1', options: ['A', 'B', 'C', 'D'], correct: 0, isPlaceholder: true },
    ];

    const result = validateQuizQuality(quiz);
    expect(result.valid).toBe(false);
    expect(result.stats.placeholders).toBe(1);
  });

  it('너무 짧은 문제를 감지해야 함', () => {
    const quiz = [{ question: '문제?', options: ['A', 'B', 'C', 'D'], correct: 0 }];

    const result = validateQuizQuality(quiz);
    expect(result.stats.shortQuestions).toBe(1);
  });

  it('중복 문제를 감지해야 함', () => {
    const quiz = [
      { question: '같은 문제입니다', options: ['A', 'B', 'C', 'D'], correct: 0 },
      { question: '같은 문제입니다', options: ['A', 'B', 'C', 'D'], correct: 1 },
    ];

    const result = validateQuizQuality(quiz);
    expect(result.stats.duplicates).toBe(1);
  });

  it('잘못된 정답 인덱스를 감지해야 함', () => {
    const quiz = [{ question: '다음 중 올바른 것은?', options: ['A', 'B'], correct: 5 }];

    const result = validateQuizQuality(quiz);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('정답 인덱스');
  });

  it('중복 선택지를 감지해야 함', () => {
    const quiz = [{ question: '다음 중 올바른 것은 무엇인가요?', options: ['A', 'A', 'C', 'D'], correct: 0 }];

    const result = validateQuizQuality(quiz);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('중복된 선택지');
  });

  it('배열이 아니면 에러를 반환해야 함', () => {
    const result = validateQuizQuality(null);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('퀴즈 데이터가 없습니다');
  });
});

describe('validateSections', () => {
  it('유효한 섹션은 valid: true를 반환해야 함', () => {
    const sections = [
      { title: '학습 목표', content: '<p>이 과정을 통해 배울 내용입니다. 충분히 긴 내용입니다. 50자 이상이 되어야 합니다.</p>' },
      { title: '핵심 내용', content: '<p>핵심적인 내용을 설명합니다. 충분히 긴 내용입니다. 50자 이상이 되어야 합니다.</p>' },
    ];

    const result = validateSections(sections);
    expect(result.valid).toBe(true);
  });

  it('빈 섹션을 감지해야 함', () => {
    const result = validateSections([]);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('섹션이 없습니다');
  });

  it('제목 없는 섹션을 감지해야 함', () => {
    const sections = [{ title: '', content: '충분히 긴 내용입니다. 50자가 넘어야 합니다. 그래서 더 길게 작성합니다.' }];

    const result = validateSections(sections);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('제목이 없습니다');
  });

  it('내용 없는 섹션을 감지해야 함', () => {
    const sections = [{ title: '학습 목표', content: '' }];

    const result = validateSections(sections);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('내용이 없습니다');
  });

  it('너무 짧은 내용을 감지해야 함', () => {
    const sections = [{ title: '학습 목표', content: '짧음' }];

    const result = validateSections(sections);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('내용이 너무 짧습니다');
  });
});

describe('validateOJTContent', () => {
  it('유효한 콘텐츠는 valid: true를 반환해야 함', () => {
    const content = {
      title: 'OJT 문서',
      team: '개발팀',
      sections: [{ title: '학습 목표', content: '<p>이 과정을 통해 배울 내용입니다. 충분히 긴 내용입니다. 50자 이상이 되어야 합니다.</p>' }],
      quiz: [
        { question: '다음 중 올바른 것은 무엇인가요?', options: ['A', 'B', 'C', 'D'], correct: 0 },
      ],
    };

    const result = validateOJTContent(content);
    expect(result.valid).toBe(true);
    expect(result.hasTitle).toBe(true);
    expect(result.hasTeam).toBe(true);
  });

  it('퀴즈와 섹션 모두 검증해야 함', () => {
    const content = {
      title: '',
      team: '',
      sections: [],
      quiz: [],
    };

    const result = validateOJTContent(content);
    expect(result.valid).toBe(false);
    expect(result.hasTitle).toBe(false);
    expect(result.hasTeam).toBe(false);
  });
});

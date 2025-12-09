/**
 * Gemini Agent - Parser Tests
 * @agent gemini-agent
 */

import { describe, it, expect } from 'vitest';
import {
  parseJSONResponse,
  parseJSONArrayResponse,
  normalizeQuizQuestion,
  createPlaceholderQuiz,
  validateAndFillResult,
} from './parser';

describe('parseJSONResponse', () => {
  it('JSON 객체를 정상적으로 파싱해야 함', () => {
    const response = `
      여기에 텍스트가 있고
      {
        "title": "테스트",
        "team": "개발팀"
      }
      그리고 추가 텍스트
    `;

    const result = parseJSONResponse(response);
    expect(result.title).toBe('테스트');
    expect(result.team).toBe('개발팀');
  });

  it('JSON이 없으면 에러를 던져야 함', () => {
    const response = '이것은 JSON이 아닙니다';
    expect(() => parseJSONResponse(response)).toThrow('JSON 형식을 찾을 수 없습니다');
  });

  it('제어 문자가 포함된 JSON을 정리해야 함', () => {
    const response = '{"title": "테스트\n값"}';
    const result = parseJSONResponse(response);
    expect(result.title).toContain('테스트');
  });

  it('trailing comma를 처리해야 함', () => {
    const response = '{"title": "테스트", }';
    const result = parseJSONResponse(response);
    expect(result.title).toBe('테스트');
  });
});

describe('parseJSONArrayResponse', () => {
  it('JSON 배열을 정상적으로 파싱해야 함', () => {
    const response = `
      [
        {"question": "문제1"},
        {"question": "문제2"}
      ]
    `;

    const result = parseJSONArrayResponse(response);
    expect(result).toHaveLength(2);
    expect(result[0].question).toBe('문제1');
  });

  it('배열이 없으면 에러를 던져야 함', () => {
    const response = '{"not": "an array"}';
    expect(() => parseJSONArrayResponse(response)).toThrow('JSON 배열을 찾을 수 없습니다');
  });
});

describe('normalizeQuizQuestion', () => {
  it('정상적인 퀴즈를 그대로 반환해야 함', () => {
    const question = {
      question: '다음 중 맞는 것은?',
      options: ['A', 'B', 'C', 'D'],
      correct: 2,
    };

    const result = normalizeQuizQuestion(question, 0, '테스트');
    expect(result.question).toBe('다음 중 맞는 것은?');
    expect(result.options).toEqual(['A', 'B', 'C', 'D']);
    expect(result.correct).toBe(2);
    expect(result.answer).toBe('C');
  });

  it('options가 없으면 기본값으로 채워야 함', () => {
    const question = { question: '문제' };
    const result = normalizeQuizQuestion(question, 0, '테스트');

    expect(result.options).toHaveLength(4);
    expect(result.correct).toBe(0);
  });

  it('correct가 범위를 벗어나면 0으로 설정해야 함', () => {
    const question = {
      question: '문제',
      options: ['A', 'B'],
      correct: 5,
    };

    const result = normalizeQuizQuestion(question, 0, '테스트');
    expect(result.correct).toBe(0);
  });

  it('question이 비어있으면 기본 문제로 채워야 함', () => {
    const question = { options: ['A', 'B', 'C', 'D'], correct: 0 };
    const result = normalizeQuizQuestion(question, 3, '테스트 문서');

    expect(result.question).toContain('테스트 문서');
    expect(result.question).toContain('4');
  });
});

describe('createPlaceholderQuiz', () => {
  it('플레이스홀더 퀴즈를 생성해야 함', () => {
    const quiz = createPlaceholderQuiz('테스트', 5);

    expect(quiz.question).toContain('[자동 생성]');
    expect(quiz.question).toContain('테스트');
    expect(quiz.question).toContain('5');
    expect(quiz.options).toHaveLength(4);
    expect(quiz.isPlaceholder).toBe(true);
  });
});

describe('validateAndFillResult', () => {
  it('유효한 결과를 그대로 반환해야 함', () => {
    const result = {
      title: '테스트',
      sections: [{ title: '섹션1', content: '<p>내용</p>' }],
      quiz: Array(20)
        .fill(null)
        .map((_, i) => ({
          question: `문제 ${i + 1}`,
          options: ['A', 'B', 'C', 'D'],
          correct: 0,
        })),
    };

    const validated = validateAndFillResult(result, '테스트', 20);
    expect(validated.sections).toHaveLength(1);
    expect(validated.quiz).toHaveLength(20);
  });

  it('sections가 없으면 기본 섹션을 추가해야 함', () => {
    const result = { title: '테스트', quiz: [] };
    const validated = validateAndFillResult(result, '테스트', 5);

    expect(validated.sections).toHaveLength(1);
    expect(validated.sections[0].title).toBe('학습 목표');
  });

  it('quiz가 부족하면 플레이스홀더로 채워야 함', () => {
    const result = {
      title: '테스트',
      sections: [{ title: '섹션', content: '내용' }],
      quiz: [{ question: '문제1', options: ['A', 'B', 'C', 'D'], correct: 0 }],
    };

    const validated = validateAndFillResult(result, '테스트', 5);
    expect(validated.quiz).toHaveLength(5);
    expect(validated.quiz[4].isPlaceholder).toBe(true);
  });
});

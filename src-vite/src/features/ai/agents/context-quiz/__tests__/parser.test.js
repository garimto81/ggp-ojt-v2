/**
 * Context Quiz Agent - Parser 단위 테스트
 * @agent context-quiz-agent
 * @blocks ai.quiz.parser.test
 * @issue #200 - Context API 기반 퀴즈 생성
 */

import { describe, it, expect } from 'vitest';
import { parseQuizResponse, validateQuiz } from '../parser';

describe('parseQuizResponse', () => {
  it('정상적인 Gemini 응답에서 퀴즈 배열을 추출한다', () => {
    const response = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  quiz: [
                    {
                      question: 'React의 주요 특징은 무엇인가요?',
                      options: ['선언적 UI', '명령형 UI', '절차적 프로그래밍', '함수형 전용'],
                      correctIndex: 0,
                      explanation: 'React는 선언적 UI 라이브러리입니다.',
                      difficulty: 'easy',
                      category: 'recall',
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    };

    const result = parseQuizResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].question).toBe('React의 주요 특징은 무엇인가요?');
    expect(result[0].options).toHaveLength(4);
    expect(result[0].correctIndex).toBe(0);
  });

  it('빈 응답은 빈 배열을 반환한다', () => {
    const response = { candidates: [] };
    expect(parseQuizResponse(response)).toEqual([]);
  });

  it('텍스트가 없는 응답은 빈 배열을 반환한다', () => {
    const response = {
      candidates: [{ content: { parts: [{}] } }],
    };
    expect(parseQuizResponse(response)).toEqual([]);
  });

  it('JSON 블록이 포함된 텍스트에서 퀴즈를 추출한다', () => {
    const response = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: '```json\n{"quiz": [{"question": "테스트 질문입니다", "options": ["A", "B", "C", "D"], "correctIndex": 1}]}\n```',
              },
            ],
          },
        },
      ],
    };

    const result = parseQuizResponse(response);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe('테스트 질문입니다');
  });

  it('answer 필드 (A/B/C/D)를 correctIndex로 변환한다', () => {
    const response = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  quiz: [
                    {
                      question: '정답이 B인 문제',
                      options: ['옵션1', '옵션2', '옵션3', '옵션4'],
                      answer: 'B',
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    };

    const result = parseQuizResponse(response);
    expect(result[0].correctIndex).toBe(1); // B = index 1
  });

  it('난이도를 정규화한다', () => {
    const response = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  quiz: [
                    { question: '쉬운 문제', options: ['1', '2', '3', '4'], correctIndex: 0, difficulty: '쉬움' },
                    { question: '어려운 문제', options: ['1', '2', '3', '4'], correctIndex: 0, difficulty: 'hard' },
                    { question: '기본 문제', options: ['1', '2', '3', '4'], correctIndex: 0 },
                  ],
                }),
              },
            ],
          },
        },
      ],
    };

    const result = parseQuizResponse(response);
    expect(result[0].difficulty).toBe('easy');
    expect(result[1].difficulty).toBe('hard');
    expect(result[2].difficulty).toBe('medium');
  });

  it('보기가 4개 미만인 퀴즈는 필터링된다', () => {
    const response = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  quiz: [
                    { question: '유효한 문제', options: ['1', '2', '3', '4'], correctIndex: 0 },
                    { question: '무효한 문제', options: ['1', '2'], correctIndex: 0 },
                  ],
                }),
              },
            ],
          },
        },
      ],
    };

    const result = parseQuizResponse(response);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe('유효한 문제');
  });
});

describe('validateQuiz', () => {
  it('유효한 퀴즈 배열을 검증한다', () => {
    const quiz = [
      { question: '충분히 긴 질문입니다. 이것은 테스트입니다.', options: ['1', '2', '3', '4'], correctIndex: 0 },
      { question: '또 다른 충분히 긴 질문입니다.', options: ['A', 'B', 'C', 'D'], correctIndex: 1 },
      { question: '세 번째 충분히 긴 질문입니다.', options: ['가', '나', '다', '라'], correctIndex: 2 },
      { question: '네 번째 충분히 긴 질문입니다.', options: ['@', '#', '$', '%'], correctIndex: 3 },
    ];

    const result = validateQuiz(quiz);
    expect(result.valid).toBe(true);
    expect(result.count).toBe(4);
    expect(result.issues).toHaveLength(0);
  });

  it('빈 배열은 유효하지 않다', () => {
    const result = validateQuiz([]);
    expect(result.valid).toBe(false);
    expect(result.issues[0].type).toBe('empty');
  });

  it('4개 미만의 퀴즈는 경고를 발생시킨다', () => {
    const quiz = [
      { question: '충분히 긴 질문입니다. 테스트.', options: ['1', '2', '3', '4'], correctIndex: 0 },
      { question: '두 번째 충분히 긴 질문입니다.', options: ['1', '2', '3', '4'], correctIndex: 0 },
    ];

    const result = validateQuiz(quiz);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.type === 'insufficient')).toBe(true);
  });

  it('짧은 질문을 감지한다', () => {
    const quiz = [
      { question: '짧음', options: ['1', '2', '3', '4'], correctIndex: 0 },
      { question: '충분히 긴 두 번째 질문입니다.', options: ['1', '2', '3', '4'], correctIndex: 0 },
      { question: '충분히 긴 세 번째 질문입니다.', options: ['1', '2', '3', '4'], correctIndex: 0 },
      { question: '충분히 긴 네 번째 질문입니다.', options: ['1', '2', '3', '4'], correctIndex: 0 },
    ];

    const result = validateQuiz(quiz);
    expect(result.issues.some((i) => i.type === 'short_question')).toBe(true);
  });

  it('잘못된 정답 인덱스를 감지한다', () => {
    const quiz = [
      { question: '충분히 긴 첫 번째 질문입니다.', options: ['1', '2', '3', '4'], correctIndex: 5 },
      { question: '충분히 긴 두 번째 질문입니다.', options: ['1', '2', '3', '4'], correctIndex: 0 },
      { question: '충분히 긴 세 번째 질문입니다.', options: ['1', '2', '3', '4'], correctIndex: 0 },
      { question: '충분히 긴 네 번째 질문입니다.', options: ['1', '2', '3', '4'], correctIndex: 0 },
    ];

    const result = validateQuiz(quiz);
    expect(result.issues.some((i) => i.type === 'invalid_answer')).toBe(true);
  });
});

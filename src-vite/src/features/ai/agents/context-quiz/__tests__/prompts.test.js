/**
 * Context Quiz Agent - Prompts 단위 테스트
 * @agent context-quiz-agent
 * @blocks ai.quiz.prompts.test
 * @issue #200 - Context API 기반 퀴즈 생성
 */

import { describe, it, expect } from 'vitest';

import {
  QUIZ_ONLY_PROMPT,
  createUrlQuizPrompt,
  createFileQuizPrompt,
  DEFAULT_QUIZ_COUNT,
} from '../prompts';

describe('QUIZ_ONLY_PROMPT', () => {
  it('필수 지시사항이 포함되어 있다', () => {
    expect(QUIZ_ONLY_PROMPT).toContain('퀴즈');
    expect(QUIZ_ONLY_PROMPT).toContain('JSON');
    expect(QUIZ_ONLY_PROMPT).toContain('question');
    expect(QUIZ_ONLY_PROMPT).toContain('options');
    expect(QUIZ_ONLY_PROMPT).toContain('correctIndex');
  });

  it('난이도 분포 지시가 있다', () => {
    expect(QUIZ_ONLY_PROMPT).toContain('쉬움');
    expect(QUIZ_ONLY_PROMPT).toContain('중간');
    expect(QUIZ_ONLY_PROMPT).toContain('어려움');
  });
});

describe('createUrlQuizPrompt', () => {
  it('URL과 퀴즈 개수가 프롬프트에 포함된다', () => {
    const prompt = createUrlQuizPrompt('https://example.com/article', 15);

    expect(prompt).toContain('https://example.com/article');
    expect(prompt).toContain('15');
  });

  it('기본 퀴즈 개수를 사용한다', () => {
    const prompt = createUrlQuizPrompt('https://example.com');

    expect(prompt).toContain(String(DEFAULT_QUIZ_COUNT));
  });

  it('QUIZ_ONLY_PROMPT의 핵심 내용이 포함된다', () => {
    const prompt = createUrlQuizPrompt('https://example.com', 10);

    expect(prompt).toContain('퀴즈');
    expect(prompt).toContain('JSON');
  });
});

describe('createFileQuizPrompt', () => {
  it('퀴즈 개수가 프롬프트에 포함된다', () => {
    const prompt = createFileQuizPrompt(20);

    expect(prompt).toContain('20');
  });

  it('기본 퀴즈 개수를 사용한다', () => {
    const prompt = createFileQuizPrompt();

    expect(prompt).toContain(String(DEFAULT_QUIZ_COUNT));
  });

  it('파일 기반 분석 지시가 있다', () => {
    const prompt = createFileQuizPrompt(10);

    // 파일/문서 관련 키워드 확인
    expect(prompt).toContain('문서');
  });
});

describe('DEFAULT_QUIZ_COUNT', () => {
  it('적절한 기본값을 가진다', () => {
    expect(DEFAULT_QUIZ_COUNT).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_QUIZ_COUNT).toBeLessThanOrEqual(20);
  });
});

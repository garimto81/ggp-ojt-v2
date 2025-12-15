/**
 * Context Quiz Agent - 퀴즈 전용 프롬프트
 * @agent context-quiz-agent
 * @blocks ai.quiz.prompt
 * @issue #200 - Context API 기반 퀴즈 생성
 */

import { CONFIG } from '@/constants';

/**
 * 퀴즈 전용 프롬프트 템플릿
 * URL/PDF 원본 기반 퀴즈만 생성 (콘텐츠 정제 없음)
 */
export const QUIZ_ONLY_PROMPT = `당신은 교육 콘텐츠 전문가입니다.
제공된 콘텐츠를 읽고 신입사원용 4지선다 퀴즈를 생성해주세요.

## 퀴즈 생성 규칙
1. {quizCount}개의 문제 생성
2. 난이도 분포: 쉬움 30% / 중간 50% / 어려움 20%
3. 유형 분포: 기억형 40% / 이해형 35% / 적용형 25%
4. 오답은 그럴듯하게 작성 (함정 보기)
5. 정답 인덱스는 0-3 랜덤 배치
6. 모든 문제는 한국어로 작성

## 난이도 기준
- easy: 명시적으로 언급된 정보, 단순 기억
- medium: 추론 필요, 복합 정보 연결
- hard: 응용, 비판적 사고, 실무 적용

## 유형 기준
- recall: 핵심 용어, 정의, 사실 기억
- comprehension: 개념 이해, 관계 파악, 비교
- application: 실무 상황 적용, 문제 해결

## 출력 형식 (JSON)
{
  "quiz": [
    {
      "question": "질문 텍스트",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "correctIndex": 0,
      "explanation": "정답 해설 (왜 정답인지 명확히)",
      "difficulty": "easy|medium|hard",
      "category": "recall|comprehension|application"
    }
  ]
}

## 주의사항
- 문제가 모호하지 않도록 명확하게 작성
- 보기는 길이가 비슷하도록 조정
- 정답이 너무 명확하거나 너무 어렵지 않도록 균형 유지
- JSON 형식을 정확히 지켜주세요
`;

/**
 * URL 기반 퀴즈 생성 프롬프트
 * @param {string} url - 대상 URL
 * @param {number} quizCount - 생성할 퀴즈 개수
 * @returns {string} 완성된 프롬프트
 */
export function createUrlQuizPrompt(url, quizCount = CONFIG.QUIZ_TOTAL_POOL) {
  return QUIZ_ONLY_PROMPT.replace('{quizCount}', quizCount) + `\n\n콘텐츠 URL: ${url}`;
}

/**
 * 파일 기반 퀴즈 생성 프롬프트
 * @param {number} quizCount - 생성할 퀴즈 개수
 * @returns {string} 완성된 프롬프트
 */
export function createFileQuizPrompt(quizCount = CONFIG.QUIZ_TOTAL_POOL) {
  return (
    QUIZ_ONLY_PROMPT.replace('{quizCount}', quizCount) +
    '\n\n위 문서의 내용을 기반으로 퀴즈를 생성해주세요.'
  );
}

/**
 * 기본 퀴즈 개수
 */
export const DEFAULT_QUIZ_COUNT = CONFIG.QUIZ_TOTAL_POOL || 10;

/**
 * Gemini Agent - Prompt Templates
 * @agent gemini-agent
 * @description OJT 콘텐츠 생성용 프롬프트 템플릿
 */

/**
 * OJT 콘텐츠 생성 프롬프트
 * @param {string} title - 문서 제목
 * @param {string} contentText - 원본 텍스트
 * @param {Object} options - 추가 옵션
 * @returns {string} 프롬프트 텍스트
 */
export function createOJTContentPrompt(title, contentText, options = {}) {
  const { stepNumber = 1, totalSteps = 1, quizCount = 20 } = options;
  const stepLabel = totalSteps > 1 ? ` (${stepNumber}/${totalSteps}단계)` : '';

  return `당신은 10년 경력의 기업 교육 설계 전문가입니다.

다음 텍스트를 분석하여 신입사원 OJT(On-the-Job Training) 교육 자료를 생성하세요.
문서 제목: "${title}${stepLabel}"

## 출력 형식 (반드시 JSON)
{
  "title": "문서 제목",
  "team": "팀 또는 분야명",
  "sections": [
    {
      "title": "섹션 제목",
      "content": "HTML 형식의 상세 내용 (p, ul, li, strong 태그 사용)"
    }
  ],
  "quiz": [
    {
      "question": "문제",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "correct": 0
    }
  ]
}

## 섹션 구성 (4-6개)
1. 학습 목표
2. 핵심 내용 (가장 중요)
3. 실무 예시
4. 주의사항
5. 요약 정리

## 퀴즈 구성 (${quizCount}개)
- 기억형 40%: 핵심 용어, 정의
- 이해형 35%: 개념 관계, 비교
- 적용형 25%: 실무 상황 판단

## 입력 텍스트
${contentText.substring(0, 12000)}`;
}

/**
 * 퀴즈 재생성 프롬프트
 * @param {string} contentText - 원본 텍스트
 * @param {number} count - 생성할 퀴즈 수
 * @param {Array} existingQuestions - 기존 문제 목록 (중복 방지)
 * @returns {string} 프롬프트 텍스트
 */
export function createQuizRegeneratePrompt(contentText, count, existingQuestions = []) {
  return `당신은 10년 경력의 기업 교육 설계 전문가입니다.

다음 텍스트를 기반으로 새로운 퀴즈 문제 ${count}개를 생성하세요.

## 출력 형식 (반드시 JSON 배열만)
[
  {
    "question": "문제 내용",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "correct": 0
  }
]

## 퀴즈 작성 규칙
- 기억형 40%: 핵심 용어, 정의 관련
- 이해형 35%: 개념 관계, 비교 관련
- 적용형 25%: 실무 상황 판단 관련
- 각 문제는 4개의 명확히 다른 선택지를 가져야 함
- 정답은 반드시 선택지 중 하나여야 함
- 문제는 20자 이상의 구체적인 질문이어야 함

## 기존 문제 (중복 방지)
${existingQuestions.join('\n')}

## 입력 텍스트
${contentText.substring(0, 8000)}`;
}

/**
 * 헬스체크용 간단한 프롬프트
 * @returns {string}
 */
export function createHealthCheckPrompt() {
  return 'Hello';
}

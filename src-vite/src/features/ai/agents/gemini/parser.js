/**
 * Gemini Agent - Response Parser
 * @agent gemini-agent
 * @description AI 응답 파싱 및 정규화 유틸리티
 */

/**
 * AI 응답에서 JSON 추출 및 파싱
 * @param {string} responseText - AI 응답 텍스트
 * @returns {Object} 파싱된 JSON 객체
 * @throws {Error} JSON 파싱 실패 시
 */
export function parseJSONResponse(responseText) {
  // JSON 객체 추출
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('JSON 형식을 찾을 수 없습니다.');
  }

  // 제어 문자 제거 및 정리
  /* eslint-disable no-control-regex */
  const controlCharRegex = /[\x00-\x1F\x7F]/g;
  /* eslint-enable no-control-regex */
  const jsonStr = jsonMatch[0]
    .replace(controlCharRegex, ' ')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/"\s*\n\s*"/g, '" "');

  return JSON.parse(jsonStr);
}

/**
 * AI 응답에서 JSON 배열 추출 및 파싱
 * @param {string} responseText - AI 응답 텍스트
 * @returns {Array} 파싱된 JSON 배열
 * @throws {Error} JSON 파싱 실패 시
 */
export function parseJSONArrayResponse(responseText) {
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('JSON 배열을 찾을 수 없습니다.');
  }

  /* eslint-disable no-control-regex */
  const jsonStr = jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, ' ');
  /* eslint-enable no-control-regex */

  return JSON.parse(jsonStr);
}

/**
 * 퀴즈 문제 정규화
 * @param {Object} question - 퀴즈 문제 객체
 * @param {number} index - 문제 인덱스
 * @param {string} title - 문서 제목 (fallback용)
 * @returns {Object} 정규화된 퀴즈 문제
 */
export function normalizeQuizQuestion(question, index, title = '') {
  const normalized = { ...question };

  // 선택지 검증
  if (!Array.isArray(normalized.options) || normalized.options.length < 2) {
    normalized.options = ['정답', '오답 1', '오답 2', '오답 3'];
    normalized.correct = 0;
  }

  // 정답 인덱스 검증
  if (
    typeof normalized.correct !== 'number' ||
    normalized.correct < 0 ||
    normalized.correct >= normalized.options.length
  ) {
    normalized.correct = 0;
  }

  // 문제 텍스트 검증
  if (!normalized.question || normalized.question.trim() === '') {
    normalized.question = `${title || '학습'} 관련 문제 ${index + 1}`;
  }

  // answer 필드 추가 (호환성)
  normalized.answer = normalized.options[normalized.correct];

  return normalized;
}

/**
 * 더미 퀴즈 문제 생성
 * @param {string} title - 문서 제목
 * @param {number} number - 문제 번호
 * @returns {Object} 더미 퀴즈 문제
 */
export function createPlaceholderQuiz(title, number) {
  return {
    question: `[자동 생성] ${title} 관련 문제 ${number}`,
    options: ['정답', '오답 1', '오답 2', '오답 3'],
    correct: 0,
    answer: '정답',
    isPlaceholder: true,
  };
}

/**
 * OJT 콘텐츠 결과 검증 및 보완
 * @param {Object} result - 파싱된 결과
 * @param {string} title - 문서 제목
 * @param {number} minQuizCount - 최소 퀴즈 수
 * @returns {Object} 검증/보완된 결과
 */
export function validateAndFillResult(result, title, minQuizCount = 20) {
  // 섹션 검증
  if (!Array.isArray(result.sections) || result.sections.length === 0) {
    result.sections = [
      {
        title: '학습 목표',
        content: '<p>내용을 확인해주세요.</p>',
      },
    ];
  }

  // 퀴즈 배열 검증
  if (!Array.isArray(result.quiz)) {
    result.quiz = [];
  }

  // 퀴즈 정규화
  result.quiz = result.quiz.map((q, idx) => normalizeQuizQuestion(q, idx, title));

  // 퀴즈 부족 시 더미 추가
  while (result.quiz.length < minQuizCount) {
    result.quiz.push(createPlaceholderQuiz(title, result.quiz.length + 1));
  }

  return result;
}

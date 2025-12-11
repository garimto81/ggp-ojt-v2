/**
 * Context Quiz Agent - 응답 파싱
 * @agent context-quiz-agent
 * @blocks ai.quiz.parser
 * @issue #200 - Context API 기반 퀴즈 생성
 */

/**
 * Gemini API 응답에서 퀴즈 배열 추출
 * @param {Object} response - Gemini API 응답
 * @returns {Array} 파싱된 퀴즈 배열
 */
export function parseQuizResponse(response) {
  try {
    // candidates[0].content.parts[0].text에서 JSON 추출
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.warn('[context-quiz] 응답에 텍스트 없음');
      return [];
    }

    // JSON 파싱 시도
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // JSON 블록 추출 시도
      parsed = extractJsonFromText(text);
    }

    // quiz 배열 추출
    const quiz = parsed?.quiz || parsed;

    if (!Array.isArray(quiz)) {
      console.warn('[context-quiz] 퀴즈 배열 아님:', typeof quiz);
      return [];
    }

    // 각 퀴즈 항목 정규화
    return quiz.map(normalizeQuizItem).filter(Boolean);
  } catch (error) {
    console.error('[context-quiz] 파싱 실패:', error);
    return [];
  }
}

/**
 * 텍스트에서 JSON 블록 추출
 * @param {string} text - 응답 텍스트
 * @returns {Object} 추출된 JSON 객체
 */
function extractJsonFromText(text) {
  // ```json ... ``` 블록 찾기
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    return JSON.parse(jsonBlockMatch[1]);
  }

  // { ... } 블록 찾기
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error('JSON 블록을 찾을 수 없음');
}

/**
 * 퀴즈 항목 정규화
 * @param {Object} item - 원본 퀴즈 항목
 * @param {number} index - 인덱스
 * @returns {Object|null} 정규화된 퀴즈 항목
 */
function normalizeQuizItem(item, index) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  // 필수 필드 확인
  const question = item.question || item.q || '';
  const options = item.options || item.choices || item.answers || [];
  const correctIndex = normalizeCorrectIndex(item);
  const explanation = item.explanation || item.hint || item.reason || '';

  // 필수 필드 검증
  if (!question || options.length < 4) {
    console.warn(`[context-quiz] 퀴즈 ${index + 1} 필수 필드 누락`);
    return null;
  }

  return {
    id: item.id || `quiz-${index + 1}`,
    question: question.trim(),
    options: options.slice(0, 4).map((o) => String(o).trim()),
    correctIndex: correctIndex,
    explanation: explanation.trim(),
    difficulty: normalizeDifficulty(item.difficulty),
    category: normalizeCategory(item.category),
  };
}

/**
 * 정답 인덱스 정규화
 * @param {Object} item - 퀴즈 항목
 * @returns {number} 0-3 사이의 인덱스
 */
function normalizeCorrectIndex(item) {
  // correctIndex 직접 사용
  if (typeof item.correctIndex === 'number') {
    return Math.max(0, Math.min(3, item.correctIndex));
  }

  // correct 필드 (숫자)
  if (typeof item.correct === 'number') {
    return Math.max(0, Math.min(3, item.correct));
  }

  // answer 필드 (숫자 또는 문자열 "A", "B", "C", "D")
  if (item.answer !== undefined) {
    if (typeof item.answer === 'number') {
      return Math.max(0, Math.min(3, item.answer));
    }
    const letterMap = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
    if (letterMap[item.answer] !== undefined) {
      return letterMap[item.answer];
    }
  }

  // 기본값
  return 0;
}

/**
 * 난이도 정규화
 * @param {string} difficulty - 원본 난이도
 * @returns {string} 'easy' | 'medium' | 'hard'
 */
function normalizeDifficulty(difficulty) {
  const d = String(difficulty || '').toLowerCase();
  if (d.includes('easy') || d.includes('쉬움') || d === '1') return 'easy';
  if (d.includes('hard') || d.includes('어려움') || d === '3') return 'hard';
  return 'medium';
}

/**
 * 유형 정규화
 * @param {string} category - 원본 유형
 * @returns {string} 'recall' | 'comprehension' | 'application'
 */
function normalizeCategory(category) {
  const c = String(category || '').toLowerCase();
  if (c.includes('recall') || c.includes('기억')) return 'recall';
  if (c.includes('application') || c.includes('적용')) return 'application';
  return 'comprehension';
}

/**
 * 퀴즈 품질 검증
 * @param {Array} quiz - 퀴즈 배열
 * @returns {Object} 검증 결과
 */
export function validateQuiz(quiz) {
  const issues = [];

  if (!Array.isArray(quiz) || quiz.length === 0) {
    issues.push({ type: 'empty', message: '퀴즈가 비어있습니다' });
    return { valid: false, issues };
  }

  if (quiz.length < 4) {
    issues.push({ type: 'insufficient', message: `퀴즈 ${quiz.length}개 (최소 4개 필요)` });
  }

  quiz.forEach((q, i) => {
    if (!q.question || q.question.length < 10) {
      issues.push({ type: 'short_question', index: i, message: '질문이 너무 짧습니다' });
    }
    if (q.options.length !== 4) {
      issues.push({ type: 'invalid_options', index: i, message: '보기가 4개가 아닙니다' });
    }
    if (q.correctIndex < 0 || q.correctIndex > 3) {
      issues.push({ type: 'invalid_answer', index: i, message: '정답 인덱스가 유효하지 않습니다' });
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    count: quiz.length,
  };
}

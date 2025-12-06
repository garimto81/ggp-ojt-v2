// OJT Master - Quiz Validator (Issue #59)
// 퀴즈 품질 검증 및 재생성

/**
 * Validate quiz quality
 * @param {Array} quiz - Array of quiz questions
 * @returns {Object} - Validation result with issues
 */
export function validateQuizQuality(quiz) {
  const issues = [];
  let placeholderCount = 0;
  let shortQuestionCount = 0;
  let duplicateCount = 0;
  const seenQuestions = new Set();

  if (!Array.isArray(quiz)) {
    return { valid: false, issues: ['퀴즈 데이터가 없습니다.'], stats: {} };
  }

  quiz.forEach((q, idx) => {
    // Check for placeholder questions
    if (q.isPlaceholder || q.question?.includes('[자동 생성]')) {
      placeholderCount++;
      issues.push(`문제 ${idx + 1}: 자동 생성된 더미 문제입니다.`);
    }

    // Check for too short questions
    if (q.question && q.question.length < 10) {
      shortQuestionCount++;
      issues.push(`문제 ${idx + 1}: 질문이 너무 짧습니다 (${q.question.length}자).`);
    }

    // Check for duplicate questions
    const questionKey = q.question?.toLowerCase().trim();
    if (seenQuestions.has(questionKey)) {
      duplicateCount++;
      issues.push(`문제 ${idx + 1}: 중복된 문제입니다.`);
    }
    seenQuestions.add(questionKey);

    // Check for invalid correct index
    if (q.correct < 0 || q.correct >= q.options?.length) {
      issues.push(`문제 ${idx + 1}: 정답 인덱스가 잘못되었습니다.`);
    }

    // Check for duplicate options
    const uniqueOptions = new Set(q.options?.map((o) => o?.toLowerCase().trim()));
    if (uniqueOptions.size < (q.options?.length || 0)) {
      issues.push(`문제 ${idx + 1}: 중복된 선택지가 있습니다.`);
    }
  });

  const stats = {
    total: quiz.length,
    placeholders: placeholderCount,
    shortQuestions: shortQuestionCount,
    duplicates: duplicateCount,
    validCount: quiz.length - placeholderCount - duplicateCount,
  };

  return {
    valid: issues.length === 0,
    issues,
    stats,
  };
}

/**
 * Regenerate specific quiz questions using WebLLM
 * @param {string} contentText - Original content text
 * @param {Array} indices - Indices of questions to regenerate
 * @param {Array} existingQuiz - Existing quiz array
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} - Updated quiz array
 */
export async function regenerateQuizQuestions(contentText, indices, existingQuiz, onProgress) {
  try {
    const { getWebLLMStatus, generateWithWebLLM } = await import('./webllm.js');
    const status = getWebLLMStatus();

    if (!status.loaded) {
      console.warn('WebLLM이 로드되지 않아 퀴즈 재생성 불가');
      return existingQuiz;
    }

    if (onProgress) onProgress('퀴즈 재생성 중...');

    // WebLLM으로 전체 콘텐츠 재생성 후 퀴즈만 교체
    const result = await generateWithWebLLM(contentText, '퀴즈 재생성', onProgress);

    if (!result.quiz || result.quiz.length === 0) {
      return existingQuiz;
    }

    // Replace specified indices with new questions
    const updatedQuiz = [...existingQuiz];
    indices.forEach((targetIdx, i) => {
      if (result.quiz[i] && targetIdx < updatedQuiz.length) {
        updatedQuiz[targetIdx] = result.quiz[i];
      }
    });

    return updatedQuiz;
  } catch (error) {
    console.warn('퀴즈 재생성 실패:', error.message);
    return existingQuiz;
  }
}

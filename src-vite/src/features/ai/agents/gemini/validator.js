/**
 * Gemini Agent - Content Validator
 * @agent gemini-agent
 * @description 퀴즈 및 콘텐츠 품질 검증
 */

/**
 * 퀴즈 품질 검증
 * @param {Array} quiz - 퀴즈 배열
 * @returns {Object} 검증 결과
 */
export function validateQuizQuality(quiz) {
  const issues = [];
  let placeholderCount = 0;
  let shortQuestionCount = 0;
  let duplicateCount = 0;
  const seenQuestions = new Set();

  if (!Array.isArray(quiz)) {
    return {
      valid: false,
      issues: ['퀴즈 데이터가 없습니다.'],
      stats: {},
    };
  }

  quiz.forEach((q, idx) => {
    // 플레이스홀더 문제 확인
    if (q.isPlaceholder || q.question?.includes('[자동 생성]')) {
      placeholderCount++;
      issues.push(`문제 ${idx + 1}: 자동 생성된 더미 문제입니다.`);
    }

    // 너무 짧은 문제 확인
    if (q.question && q.question.length < 10) {
      shortQuestionCount++;
      issues.push(`문제 ${idx + 1}: 질문이 너무 짧습니다 (${q.question.length}자).`);
    }

    // 중복 문제 확인
    const questionKey = q.question?.toLowerCase().trim();
    if (seenQuestions.has(questionKey)) {
      duplicateCount++;
      issues.push(`문제 ${idx + 1}: 중복된 문제입니다.`);
    }
    seenQuestions.add(questionKey);

    // 정답 인덱스 검증
    if (q.correct < 0 || q.correct >= q.options?.length) {
      issues.push(`문제 ${idx + 1}: 정답 인덱스가 잘못되었습니다.`);
    }

    // 중복 선택지 확인
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
 * 섹션 품질 검증
 * @param {Array} sections - 섹션 배열
 * @returns {Object} 검증 결과
 */
export function validateSections(sections) {
  const issues = [];

  if (!Array.isArray(sections) || sections.length === 0) {
    return {
      valid: false,
      issues: ['섹션이 없습니다.'],
    };
  }

  sections.forEach((section, idx) => {
    if (!section.title || section.title.trim() === '') {
      issues.push(`섹션 ${idx + 1}: 제목이 없습니다.`);
    }

    if (!section.content || section.content.trim() === '') {
      issues.push(`섹션 ${idx + 1}: 내용이 없습니다.`);
    }

    if (section.content && section.content.length < 50) {
      issues.push(`섹션 ${idx + 1}: 내용이 너무 짧습니다.`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    sectionCount: sections.length,
  };
}

/**
 * 전체 OJT 콘텐츠 검증
 * @param {Object} content - OJT 콘텐츠 객체
 * @returns {Object} 종합 검증 결과
 */
export function validateOJTContent(content) {
  const quizResult = validateQuizQuality(content.quiz);
  const sectionResult = validateSections(content.sections);

  return {
    valid: quizResult.valid && sectionResult.valid,
    quiz: quizResult,
    sections: sectionResult,
    hasTitle: !!content.title,
    hasTeam: !!content.team,
  };
}

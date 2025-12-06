// OJT Master - Fallback Content Generator (Issue #59)
// AI 실패 시 폴백 콘텐츠 생성

import DOMPurify from 'dompurify';

/**
 * Create fallback content when AI generation fails
 * @param {string} contentText - Raw content text
 * @param {string} title - Document title
 * @param {string} errorMessage - Error message from AI
 * @returns {Object} - Fallback OJT content
 */
export function createFallbackContent(contentText, title, errorMessage) {
  // Sanitize HTML to prevent XSS
  const sanitizedContent = DOMPurify.sanitize(contentText, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'a',
      'pre',
      'code',
    ],
    ALLOWED_ATTR: ['href', 'target'],
  });

  // Convert plain text to HTML paragraphs if no HTML tags detected
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(contentText);
  const formattedContent = hasHtmlTags
    ? sanitizedContent
    : `<div class="raw-content">${sanitizedContent
        .split('\n\n')
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('')}</div>`;

  return {
    title: title || '제목 없음',
    team: '미분류',
    sections: [
      {
        title: '원문 내용',
        content: formattedContent,
      },
    ],
    quiz: [],
    ai_processed: false,
    ai_error: errorMessage,
  };
}

/**
 * Create a placeholder quiz question
 * @param {string} title - Document title
 * @param {number} number - Question number
 * @returns {Object} - Placeholder quiz question
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
 * Normalize a quiz question to ensure consistent format
 * @param {Object} question - Quiz question object
 * @param {number} index - Question index
 * @param {string} title - Document title for fallback
 * @returns {Object} - Normalized quiz question
 */
export function normalizeQuizQuestion(question, index, title) {
  const normalized = { ...question };

  // Ensure options array exists and has at least 2 items
  if (!Array.isArray(normalized.options) || normalized.options.length < 2) {
    normalized.options = ['정답', '오답 1', '오답 2', '오답 3'];
    normalized.correct = 0;
  }

  // Ensure correct index is valid
  if (
    typeof normalized.correct !== 'number' ||
    normalized.correct < 0 ||
    normalized.correct >= normalized.options.length
  ) {
    normalized.correct = 0;
  }

  // Add answer field for compatibility
  normalized.answer = normalized.options[normalized.correct];

  // Ensure question text exists
  if (!normalized.question || normalized.question.trim() === '') {
    normalized.question = `${title} 관련 문제 ${index + 1}`;
  }

  return normalized;
}

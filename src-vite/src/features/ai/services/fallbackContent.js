// OJT Master - Fallback Content Generator (Issue #59, #104)
// AI 실패 시 폴백 콘텐츠 생성 - 키워드 기반 퀴즈 개선

import DOMPurify from 'dompurify';

// 한국어 불용어 (제외할 단어)
const STOPWORDS = new Set([
  '이',
  '가',
  '은',
  '는',
  '을',
  '를',
  '에',
  '에서',
  '로',
  '으로',
  '와',
  '과',
  '의',
  '도',
  '만',
  '부터',
  '까지',
  '이다',
  '있다',
  '하다',
  '되다',
  '않다',
  '그',
  '저',
  '이것',
  '그것',
  '저것',
  '여기',
  '거기',
  '저기',
  '누구',
  '무엇',
  '어디',
  '언제',
  '왜',
  '어떻게',
  '그리고',
  '그러나',
  '하지만',
  '또는',
  '및',
  '등',
  '것',
  '수',
  '더',
  '때',
  '중',
  '후',
  '전',
  '위',
  '아래',
  '안',
  '밖',
]);

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

/**
 * 텍스트에서 키워드 추출
 * @param {string} text - 원본 텍스트
 * @param {number} maxKeywords - 최대 키워드 수
 * @returns {string[]} - 추출된 키워드 배열
 */
function extractKeywords(text, maxKeywords = 15) {
  // 한글 단어 추출 (2글자 이상)
  const koreanWords = text.match(/[가-힣]{2,}/g) || [];

  // 영문 단어 추출 (3글자 이상)
  const englishWords = text.match(/[a-zA-Z]{3,}/gi) || [];

  // 단어 빈도 계산
  const wordCount = {};
  [...koreanWords, ...englishWords].forEach((word) => {
    const lowerWord = word.toLowerCase();
    if (!STOPWORDS.has(lowerWord) && word.length >= 2) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });

  // 빈도순 정렬 후 상위 키워드 반환
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * 키워드 기반 퀴즈 생성
 * @param {string[]} keywords - 키워드 배열
 * @param {string} title - 문서 제목
 * @param {number} count - 생성할 퀴즈 수
 * @returns {Object[]} - 퀴즈 배열
 */
function generateKeywordQuiz(keywords, title, count = 10) {
  const quizTemplates = [
    { q: '다음 중 "${title}"에서 다루는 핵심 개념은?', type: 'concept' },
    { q: '"${keyword}"의 의미로 가장 적절한 것은?', type: 'definition' },
    { q: '다음 중 "${title}" 관련 용어가 아닌 것은?', type: 'exclusion' },
    { q: '"${keyword}"와 가장 관련 있는 것은?', type: 'relation' },
    { q: '다음 중 "${title}"의 주요 내용으로 올바른 것은?', type: 'content' },
  ];

  const quizzes = [];

  for (let i = 0; i < count; i++) {
    const template = quizTemplates[i % quizTemplates.length];
    const keyword = keywords[i % keywords.length] || title;

    // 오답 생성 (다른 키워드 또는 일반적인 오답)
    const otherKeywords = keywords.filter((k) => k !== keyword);
    const wrongAnswers = [
      otherKeywords[0] || '관련 없는 용어 1',
      otherKeywords[1] || '관련 없는 용어 2',
      otherKeywords[2] || '관련 없는 용어 3',
    ];

    const question = template.q.replace('${title}', title).replace('${keyword}', keyword);

    // 정답 위치 랜덤화
    const correctIndex = Math.floor(Math.random() * 4);
    const options = [...wrongAnswers];
    options.splice(correctIndex, 0, keyword);

    quizzes.push({
      question,
      options: options.slice(0, 4),
      correct: correctIndex,
      answer: keyword,
      isAuto: true,
      explanation: `"${keyword}"는 이 문서의 핵심 개념입니다.`,
    });
  }

  return quizzes;
}

/**
 * 개선된 Fallback Content 생성
 * 키워드 추출 및 자동 퀴즈 생성 포함
 *
 * @param {string} contentText - 원본 텍스트
 * @param {string} title - 문서 제목
 * @param {Array} errors - 에러 정보 배열
 * @returns {Object} - Fallback OJT 콘텐츠
 */
export function createEnhancedFallbackContent(contentText, title, errors = []) {
  // HTML Sanitize
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

  // 단락 분리
  const paragraphs = contentText.split(/\n\n+/).filter((p) => p.trim().length > 30);

  // 섹션 구성 (최대 5개)
  const sections =
    paragraphs.length > 1
      ? paragraphs.slice(0, 5).map((p, i) => ({
          title: `섹션 ${i + 1}`,
          content: `<p>${DOMPurify.sanitize(p.replace(/\n/g, '</p><p>'))}</p>`,
        }))
      : [
          {
            title: '학습 내용',
            content: `<div class="raw-content">${sanitizedContent
              .split('\n\n')
              .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
              .join('')}</div>`,
          },
        ];

  // 키워드 추출 및 퀴즈 생성
  const keywords = extractKeywords(contentText, 15);
  const quiz = keywords.length > 0 ? generateKeywordQuiz(keywords, title, 10) : [];

  // 에러 메시지 구성
  const errorSummary =
    errors.length > 0
      ? errors.map((e) => `${e.engine}: ${e.error}`).join(', ')
      : 'AI 엔진을 사용할 수 없습니다.';

  return {
    title: title || '제목 없음',
    team: '미분류',
    sections,
    quiz,
    summary: `이 문서는 AI 분석 없이 원본 텍스트로 등록되었습니다. (${new Date().toLocaleString('ko-KR')})`,
    estimated_minutes: Math.max(5, Math.ceil(contentText.length / 500)),
    ai_processed: false,
    ai_engine: 'fallback',
    ai_error: errorSummary,
    _fallback: {
      reason: errorSummary,
      timestamp: new Date().toISOString(),
      keywords: keywords.slice(0, 10),
      regeneratable: true,
    },
  };
}

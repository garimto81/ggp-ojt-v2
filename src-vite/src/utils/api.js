// OJT Master v2.6.1 - API Utilities (Supabase, LLM Service)

import { createClient } from '@supabase/supabase-js';
import DOMPurify from 'dompurify';
import { SUPABASE_CONFIG, CONFIG, CORS_PROXIES } from '../constants';
import { llmService, LLM_PROVIDERS } from '../services/llm';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);

// Make supabase available globally for db.js
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

/**
 * Check AI status (uses active LLM provider)
 * @returns {Promise<{online: boolean, model: string, provider: string}>}
 */
export async function checkAIStatus() {
  try {
    const status = await llmService.checkStatus();
    return status;
  } catch (error) {
    console.error('AI status check failed:', error);
    const provider = llmService.getActiveProvider();
    return {
      online: false,
      model: provider?.getModel() || 'unknown',
      provider: provider?.getName() || 'unknown',
    };
  }
}

/**
 * Check all available LLM providers status
 * @returns {Promise<Object>} - Status of all providers
 */
export async function checkAllProvidersStatus() {
  return llmService.checkAllStatus();
}

/**
 * Set active LLM provider
 * @param {string} providerName - Provider name ('gemini', 'groq', 'ollama')
 * @returns {boolean} - Success status
 */
export function setLLMProvider(providerName) {
  return llmService.setActiveProvider(providerName);
}

/**
 * Get current LLM provider name
 * @returns {string}
 */
export function getCurrentProvider() {
  return llmService.getActiveProvider()?.getName() || 'unknown';
}

/**
 * Get available LLM providers
 * @returns {string[]}
 */
export function getAvailableProviders() {
  return llmService.getAvailableProviders();
}

// Re-export LLM_PROVIDERS for convenience
export { LLM_PROVIDERS };

/**
 * Generate OJT content using LLM Service (with fallback)
 * @param {string} contentText - Raw content text
 * @param {string} title - Document title
 * @param {number} stepNumber - Current step number
 * @param {number} totalSteps - Total number of steps
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Generated OJT content
 */
export async function generateOJTContent(
  contentText,
  title,
  stepNumber = 1,
  totalSteps = 1,
  onProgress
) {
  const stepLabel = totalSteps > 1 ? ` (${stepNumber}/${totalSteps}단계)` : '';

  const prompt = `당신은 10년 경력의 기업 교육 설계 전문가입니다.

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

## 퀴즈 구성 (20개)
- 기억형 40%: 핵심 용어, 정의
- 이해형 35%: 개념 관계, 비교
- 적용형 25%: 실무 상황 판단

## 입력 텍스트
${contentText.substring(0, 12000)}`;

  try {
    const providerName = llmService.getActiveProvider()?.getName() || 'unknown';
    if (onProgress) onProgress(`AI 분석 중... (${providerName})`);

    // Use LLM Service with automatic fallback
    const {
      text: responseText,
      provider,
      fallbackUsed,
    } = await llmService.generate({
      prompt,
      temperature: CONFIG.AI_TEMPERATURE,
      maxTokens: CONFIG.AI_MAX_TOKENS,
      useFallback: true,
    });

    if (fallbackUsed) {
      console.info(`Fallback to ${provider} provider`);
    }

    if (!responseText) {
      throw new Error('AI 응답이 비어있습니다.');
    }

    // Parse AI response
    const result = parseAIResponse(responseText);
    result.llm_provider = provider; // Track which provider was used

    // Validate and fill quiz if needed
    return validateAndFillResult(result, title);
  } catch (error) {
    console.warn('AI 분석 실패, 원문 모드로 전환:', error.message);

    // Graceful Degradation: 원문 그대로 반환
    if (onProgress) onProgress('AI 분석 실패 - 원문으로 등록 중...');

    return createFallbackContent(contentText, title, error.message);
  }
}

/**
 * Create fallback content when AI generation fails
 * @param {string} contentText - Raw content text
 * @param {string} title - Document title
 * @param {string} errorMessage - Error message from AI
 * @returns {Object} - Fallback OJT content
 */
function createFallbackContent(contentText, title, errorMessage) {
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
 * Parse AI response to JSON
 */
function parseAIResponse(responseText) {
  // Try to extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('JSON 형식을 찾을 수 없습니다.');
  }

  // Clean JSON string (remove control characters)
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
 * Validate and fill OJT result
 */
function validateAndFillResult(result, title) {
  // Ensure sections exist
  if (!Array.isArray(result.sections) || result.sections.length === 0) {
    result.sections = [{ title: '학습 목표', content: '<p>내용을 확인해주세요.</p>' }];
  }

  // Ensure quiz exists and has enough questions
  if (!Array.isArray(result.quiz)) {
    result.quiz = [];
  }

  // Normalize and validate each quiz question
  result.quiz = result.quiz.map((q, idx) => normalizeQuizQuestion(q, idx, title));

  // Fill quiz if less than required
  while (result.quiz.length < CONFIG.QUIZ_TOTAL_POOL) {
    result.quiz.push(createPlaceholderQuiz(title, result.quiz.length + 1));
  }

  return result;
}

/**
 * Normalize a quiz question to ensure consistent format
 * @param {Object} question - Quiz question object
 * @param {number} index - Question index
 * @param {string} title - Document title for fallback
 * @returns {Object} - Normalized quiz question
 */
function normalizeQuizQuestion(question, index, title) {
  const normalized = { ...question };

  // Ensure options array exists and has 4 items
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
 * Create a placeholder quiz question
 */
function createPlaceholderQuiz(title, number) {
  return {
    question: `[자동 생성] ${title} 관련 문제 ${number}`,
    options: ['정답', '오답 1', '오답 2', '오답 3'],
    correct: 0,
    answer: '정답',
    isPlaceholder: true,
  };
}

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
 * Regenerate specific quiz questions using LLM Service
 * @param {string} contentText - Original content text
 * @param {Array} indices - Indices of questions to regenerate
 * @param {Array} existingQuiz - Existing quiz array
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} - Updated quiz array
 */
export async function regenerateQuizQuestions(contentText, indices, existingQuiz, onProgress) {
  const count = indices.length;

  const prompt = `당신은 10년 경력의 기업 교육 설계 전문가입니다.

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
${existingQuiz
  .filter((_, i) => !indices.includes(i))
  .map((q) => q.question)
  .join('\n')}

## 입력 텍스트
${contentText.substring(0, 8000)}`;

  try {
    const providerName = llmService.getActiveProvider()?.getName() || 'unknown';
    if (onProgress) onProgress(`퀴즈 재생성 중... (${providerName})`);

    // Use LLM Service with automatic fallback
    const { text: responseText } = await llmService.generate({
      prompt,
      temperature: 0.5,
      maxTokens: 4096,
      useFallback: true,
    });

    if (!responseText) {
      throw new Error('AI 응답이 비어있습니다.');
    }

    // Parse new questions
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('JSON 배열을 찾을 수 없습니다.');
    }

    // eslint-disable-next-line no-control-regex
    const jsonStr = jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, ' ');
    const newQuestions = JSON.parse(jsonStr);

    // Replace specified indices with new questions
    const updatedQuiz = [...existingQuiz];
    indices.forEach((targetIdx, i) => {
      if (newQuestions[i] && targetIdx < updatedQuiz.length) {
        updatedQuiz[targetIdx] = normalizeQuizQuestion(newQuestions[i], targetIdx, '');
      }
    });

    return updatedQuiz;
  } catch (error) {
    console.warn('퀴즈 재생성 실패:', error.message);
    // Graceful Degradation: 기존 퀴즈 그대로 반환
    return existingQuiz;
  }
}

/**
 * Extract text from URL using CORS proxy
 * @param {string} url - URL to extract text from
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{text: string, wasTruncated: boolean, originalLength: number, extractedLength: number}>}
 */
export async function extractUrlText(url, onProgress) {
  // SSRF validation
  if (!validateUrlForSSRF(url)) {
    throw new Error('허용되지 않는 URL입니다.');
  }

  if (onProgress) onProgress('URL에서 텍스트 추출 중...');

  let lastError = null;

  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url));
      if (!response.ok) continue;

      const html = await response.text();

      // Extract text from HTML
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Remove scripts, styles, etc.
      doc
        .querySelectorAll('script, style, nav, footer, header, aside')
        .forEach((el) => el.remove());

      const text = doc.body?.textContent?.trim() || '';
      const originalLength = text.length;

      // Truncate if too long
      const truncatedText = text.substring(0, CONFIG.MAX_URL_EXTRACT_CHARS);

      return {
        text: truncatedText,
        wasTruncated: originalLength > CONFIG.MAX_URL_EXTRACT_CHARS,
        originalLength,
        extractedLength: truncatedText.length,
      };
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error('URL 텍스트 추출 실패');
}

/**
 * Validate URL for SSRF attacks
 */
function validateUrlForSSRF(url) {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and internal IPs
    const blockedPatterns = [
      'localhost',
      '127.',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
      '192.168.',
      '169.254.',
      '0.0.0.0',
      'metadata.google',
      '169.254.169.254',
    ];

    return !blockedPatterns.some((pattern) => hostname === pattern || hostname.startsWith(pattern));
  } catch {
    return false;
  }
}

/**
 * Upload image to R2
 * @param {File} file - Image file
 * @returns {Promise<string>} - Public URL of uploaded image
 */
export async function uploadImageToR2(file) {
  const { R2_CONFIG } = await import('../constants');

  // Validate file type
  if (!R2_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    throw new Error('허용되지 않는 파일 형식입니다.');
  }

  // Validate file size
  if (file.size > R2_CONFIG.MAX_SIZE) {
    throw new Error('파일 크기가 10MB를 초과합니다.');
  }

  // Step 1: Get upload key
  const prepareResponse = await fetch(R2_CONFIG.WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  });

  if (!prepareResponse.ok) {
    const error = await prepareResponse.json();
    throw new Error(error.error || '업로드 준비 실패');
  }

  const { key, publicUrl } = await prepareResponse.json();

  // Step 2: Upload file
  const uploadResponse = await fetch(`${R2_CONFIG.WORKER_URL}/upload`, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'X-Upload-Key': key,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(error.error || '업로드 실패');
  }

  return publicUrl;
}

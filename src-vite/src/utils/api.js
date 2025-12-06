// OJT Master v2.9.0 - API Utilities (Supabase, WebLLM Only)

import { createClient } from '@supabase/supabase-js';
import DOMPurify from 'dompurify';
import { SUPABASE_CONFIG, CONFIG } from '../constants';

// Validate Supabase URL at startup (Issue #52)
if (typeof window !== 'undefined') {
  const supabaseUrl = SUPABASE_CONFIG.URL;

  // Warn if URL is empty or pointing to localhost (common misconfiguration)
  if (!supabaseUrl) {
    console.error('[Supabase] VITE_SUPABASE_URL is not set. Please check your .env file.');
  } else if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
    console.warn(
      '[Supabase] URL is pointing to localhost:',
      supabaseUrl,
      '\nIf this is unexpected, try:\n' +
        '1. Clear browser cache\n' +
        '2. Delete node_modules/.vite folder\n' +
        '3. Restart dev server with: npm run dev'
    );
  } else {
    console.info('[Supabase] Connected to:', supabaseUrl);
  }
}

// Initialize Supabase client
export const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);

// Make supabase available globally for db.js
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

/**
 * Check WebLLM AI status
 * @returns {Promise<{online: boolean, model: string|null, loaded: boolean}>}
 */
export async function checkAIStatus() {
  try {
    const { getWebLLMStatus, checkWebGPUSupport } =
      await import('../features/ai/services/webllm.js');
    const status = getWebLLMStatus();
    const webgpuSupported = await checkWebGPUSupport();

    return {
      online: webgpuSupported,
      model: status.model,
      loaded: status.loaded,
      loading: status.loading,
      progress: status.progress,
      webgpuSupported,
    };
  } catch (error) {
    console.error('AI status check failed:', error);
    return { online: false, model: null, loaded: false, webgpuSupported: false };
  }
}

/**
 * Generate OJT content using WebLLM (브라우저 내 AI)
 * @param {string} contentText - Raw content text
 * @param {string} title - Document title
 * @param {number} stepNumber - Current step number (unused, for compatibility)
 * @param {number} totalSteps - Total number of steps (unused, for compatibility)
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
  try {
    const { generateWithWebLLM, getWebLLMStatus } =
      await import('../features/ai/services/webllm.js');
    const status = getWebLLMStatus();

    if (!status.loaded) {
      throw new Error('WebLLM이 로드되지 않았습니다. 먼저 모델을 로드해주세요.');
    }

    if (onProgress) onProgress('WebLLM으로 콘텐츠 생성 중...');
    const result = await generateWithWebLLM(contentText, title, onProgress);
    result.ai_engine = 'webllm';
    return result;
  } catch (error) {
    console.warn('WebLLM 생성 실패:', error.message);

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
 * Regenerate specific quiz questions using WebLLM
 * @param {string} contentText - Original content text
 * @param {Array} indices - Indices of questions to regenerate
 * @param {Array} existingQuiz - Existing quiz array
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} - Updated quiz array
 */
export async function regenerateQuizQuestions(contentText, indices, existingQuiz, onProgress) {
  try {
    const { getWebLLMStatus } = await import('../features/ai/services/webllm.js');
    const status = getWebLLMStatus();

    if (!status.loaded) {
      console.warn('WebLLM이 로드되지 않아 퀴즈 재생성 불가');
      return existingQuiz;
    }

    if (onProgress) onProgress('퀴즈 재생성 중...');

    // WebLLM으로 전체 콘텐츠 재생성 후 퀴즈만 교체
    const { generateWithWebLLM } = await import('../features/ai/services/webllm.js');
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

/**
 * Extract text from URL using CORS proxy (FR-801)
 * 우선순위: 자체 R2 Worker > allorigins > corsproxy
 * @param {string} url - URL to extract text from
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{text: string, wasTruncated: boolean, originalLength: number, extractedLength: number, metadata: Object}>}
 */
export async function extractUrlText(url, onProgress) {
  // SSRF validation
  if (!validateUrlForSSRF(url)) {
    throw new Error('허용되지 않는 URL입니다.');
  }

  if (onProgress) onProgress('URL에서 텍스트 추출 중...');

  // 동적 import로 순환 참조 방지
  const { fetchWithCorsProxy, extractTextContent, extractMetadata } =
    await import('./cors-proxy.js');

  try {
    const html = await fetchWithCorsProxy(url);

    // 메타데이터 추출
    const metadata = extractMetadata(html);

    // 본문 텍스트 추출
    const result = extractTextContent(html, CONFIG.MAX_URL_EXTRACT_CHARS);

    return {
      ...result,
      metadata,
    };
  } catch (error) {
    throw new Error(`URL 텍스트 추출 실패: ${error.message}`);
  }
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

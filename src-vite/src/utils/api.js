// OJT Master v2.19.0 - API Utilities (Supabase, Gemini)
// Issue #200: WebLLM 제거, Gemini 단일 엔진

import { createClient } from '@supabase/supabase-js';
import DOMPurify from 'dompurify';
import { SUPABASE_CONFIG, CONFIG } from '../constants';

// Import gemini-agent functions
import {
  generateOJTContent as geminiGenerateOJTContent,
  generateUrlQuizOnly as geminiGenerateUrlQuizOnly,
  regenerateQuiz as geminiRegenerateQuiz,
  checkStatus as geminiCheckStatus,
  validateQuizQuality as geminiValidateQuizQuality,
} from '@features/ai/agents/gemini';

// Initialize Supabase client with session auto-refresh (Issue #188)
export const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
  auth: {
    autoRefreshToken: true, // 토큰 자동 갱신
    persistSession: true, // 세션 localStorage 저장
    detectSessionInUrl: true, // OAuth 리다이렉트 시 URL에서 세션 감지
  },
});

// Make supabase available globally for db.js
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

/**
 * Check Gemini AI status
 * @returns {Promise<{online: boolean, model: string, latency?: number}>}
 */
export async function checkAIStatus() {
  return geminiCheckStatus();
}

/**
 * Generate OJT content using Gemini API
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
  // Gemini API 사용 - gemini-agent
  try {
    const result = await geminiGenerateOJTContent({
      contentText,
      title,
      onProgress,
      options: {
        stepNumber,
        totalSteps,
        quizCount: CONFIG.QUIZ_TOTAL_POOL,
      },
    });

    return result;
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
 * Generate URL quiz only (no sections) - Issue #211
 * URL 학습은 원본 페이지를 직접 보여주므로 섹션 없이 퀴즈만 생성
 * @param {string} contentText - URL에서 추출한 텍스트 (퀴즈 생성용)
 * @param {string} title - 문서 제목
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Generated quiz content (no sections)
 */
export async function generateUrlQuizOnly(contentText, title, onProgress) {
  try {
    const result = await geminiGenerateUrlQuizOnly({
      contentText,
      title,
      onProgress,
      options: {
        quizCount: CONFIG.QUIZ_TOTAL_POOL,
      },
    });

    return result;
  } catch (error) {
    console.warn('URL 퀴즈 생성 실패:', error.message);

    // Graceful Degradation: 빈 퀴즈 반환
    if (onProgress) onProgress('퀴즈 생성 실패...');

    return {
      title: title || '제목 없음',
      team: '미분류',
      sections: [], // URL은 섹션 없음
      quiz: [],
      ai_processed: false,
      ai_error: error.message,
    };
  }
}

/**
 * Validate quiz quality
 * @param {Array} quiz - Array of quiz questions
 * @returns {Object} - Validation result with issues
 */
export function validateQuizQuality(quiz) {
  return geminiValidateQuizQuality(quiz);
}

/**
 * Regenerate specific quiz questions using AI
 * @param {string} contentText - Original content text
 * @param {Array} indices - Indices of questions to regenerate
 * @param {Array} existingQuiz - Existing quiz array
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} - Updated quiz array
 */
export async function regenerateQuizQuestions(contentText, indices, existingQuiz, onProgress) {
  return geminiRegenerateQuiz({
    contentText,
    existingQuiz,
    indices,
    onProgress,
  });
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

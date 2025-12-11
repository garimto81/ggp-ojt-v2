/**
 * Context Quiz Agent - URL Context Tool
 * @agent context-quiz-agent
 * @blocks ai.quiz.url
 * @issue #200 - Context API 기반 퀴즈 생성
 *
 * Gemini URL Context Tool을 사용하여 URL 기반 퀴즈를 생성합니다.
 * CORS 프록시 없이 Gemini가 직접 URL 콘텐츠를 가져옵니다.
 *
 * @see https://developers.googleblog.com/en/url-context-tool-for-gemini-api-now-generally-available/
 */

import { GEMINI_CONFIG, CONFIG } from '@/constants';
import { createUrlQuizPrompt, DEFAULT_QUIZ_COUNT } from './prompts';
import { parseQuizResponse, validateQuiz } from './parser';

/**
 * URL 기반 퀴즈 생성 (URL Context Tool 사용)
 *
 * @param {string} url - 콘텐츠 URL
 * @param {Object} options - 옵션
 * @param {number} options.quizCount - 생성할 퀴즈 개수 (기본: 10-20)
 * @param {Function} options.onProgress - 진행률 콜백
 * @returns {Promise<Array>} 생성된 퀴즈 배열
 *
 * @example
 * const quiz = await generateQuizFromUrl('https://example.com/article', {
 *   quizCount: 10,
 *   onProgress: (msg) => console.log(msg)
 * });
 */
export async function generateQuizFromUrl(url, options = {}) {
  const { quizCount = DEFAULT_QUIZ_COUNT, onProgress } = options;

  if (!GEMINI_CONFIG.API_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다');
  }

  if (!url || typeof url !== 'string') {
    throw new Error('유효한 URL이 필요합니다');
  }

  // URL 유효성 검사
  try {
    new URL(url);
  } catch {
    throw new Error('올바른 URL 형식이 아닙니다');
  }

  onProgress?.('URL 콘텐츠 분석 중...');

  try {
    const apiUrl = `${GEMINI_CONFIG.API_URL}/${GEMINI_CONFIG.MODEL}:generateContent?key=${GEMINI_CONFIG.API_KEY}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: createUrlQuizPrompt(url, quizCount),
            },
          ],
        },
      ],
      // URL Context Tool 활성화
      tools: [{ url_context: {} }],
      generationConfig: {
        temperature: CONFIG.AI_TEMPERATURE || 0.3,
        maxOutputTokens: CONFIG.AI_MAX_TOKENS || 8192,
        responseMimeType: 'application/json',
      },
    };

    onProgress?.('Gemini API로 퀴즈 생성 중...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMsg = error.error?.message || `API 오류: ${response.status}`;

      // 특정 에러 처리
      if (response.status === 429) {
        throw new Error('API 할당량 초과. 잠시 후 다시 시도해주세요.');
      }
      if (response.status === 403) {
        throw new Error('API 접근 권한이 없습니다. API 키를 확인해주세요.');
      }

      throw new Error(errorMsg);
    }

    const data = await response.json();
    onProgress?.('퀴즈 파싱 중...');

    // 응답 파싱
    const quiz = parseQuizResponse(data);

    // 퀴즈 검증
    const validation = validateQuiz(quiz);
    if (!validation.valid) {
      console.warn('[context-quiz] 퀴즈 품질 이슈:', validation.issues);
    }

    onProgress?.(`퀴즈 ${quiz.length}개 생성 완료`);

    return quiz;
  } catch (error) {
    console.error('[context-quiz] URL 퀴즈 생성 실패:', error);

    // 네트워크 에러
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('네트워크 연결을 확인해주세요');
    }

    throw error;
  }
}

/**
 * URL이 접근 가능한지 확인 (선택적)
 * @param {string} url - 확인할 URL
 * @returns {Promise<boolean>}
 */
export async function checkUrlAccessible(url) {
  try {
    // HEAD 요청으로 접근 가능 여부만 확인
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return response.ok || response.type === 'opaque';
  } catch {
    return false;
  }
}

/**
 * URL에서 기본 제목 추출
 * @param {string} url - URL 문자열
 * @returns {string} 추출된 제목
 */
export function extractTitleFromUrl(url) {
  try {
    const urlObj = new URL(url);
    // 경로에서 마지막 부분 추출
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      // 확장자 제거
      return decodeURIComponent(lastPart.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    }
    // 호스트명 반환
    return urlObj.hostname;
  } catch {
    return 'URL 문서';
  }
}

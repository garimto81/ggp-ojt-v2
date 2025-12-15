/**
 * Gemini Agent - API Client
 * @agent gemini-agent
 * @description Gemini AI API 클라이언트 (OJT 콘텐츠 생성)
 */

import { GEMINI_CONFIG, CONFIG } from '@/constants';

import {
  parseJSONResponse,
  parseJSONArrayResponse,
  validateAndFillResult,
  normalizeQuizQuestion,
  createPlaceholderQuiz,
} from './parser';
import {
  createOJTContentPrompt,
  createQuizRegeneratePrompt,
  createUrlQuizOnlyPrompt,
  createHealthCheckPrompt,
} from './prompts';

/** Rate Limiting 설정 */
const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  retryableStatuses: [429, 503, 500],
};

/**
 * 지연 함수 (테스트 가능하도록 export)
 * @param {number} ms - 대기 시간 (밀리초)
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exponential backoff 대기 시간 계산
 * @param {number} attempt - 현재 시도 횟수 (0부터 시작)
 * @returns {number} 대기 시간 (밀리초)
 */
export const calculateBackoff = (attempt) => {
  return Math.pow(2, attempt) * RATE_LIMIT_CONFIG.baseDelayMs;
};

/**
 * Gemini API 기본 요청 (Rate Limiting 포함)
 * @param {string} prompt - 프롬프트 텍스트
 * @param {Object} options - 생성 옵션
 * @param {number} options.temperature - 생성 온도
 * @param {number} options.maxTokens - 최대 토큰 수
 * @param {number} options.maxRetries - 최대 재시도 횟수 (기본: 3)
 * @returns {Promise<string>} AI 응답 텍스트
 */
async function callGeminiAPI(prompt, options = {}) {
  const {
    temperature = CONFIG.AI_TEMPERATURE,
    maxTokens = CONFIG.AI_MAX_TOKENS,
    maxRetries = RATE_LIMIT_CONFIG.maxRetries,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `${GEMINI_CONFIG.API_URL}/${GEMINI_CONFIG.MODEL}:generateContent?key=${GEMINI_CONFIG.API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
        }
      );

      // Rate Limit 또는 일시적 오류 시 재시도
      if (RATE_LIMIT_CONFIG.retryableStatuses.includes(response.status)) {
        if (attempt < maxRetries) {
          const waitTime = calculateBackoff(attempt);
          console.warn(
            `Gemini API ${response.status} 오류, ${waitTime}ms 후 재시도 (${attempt + 1}/${maxRetries})`
          );
          await delay(waitTime);
          continue;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Gemini API 오류: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error('AI 응답이 비어있습니다.');
      }

      return responseText;
    } catch (error) {
      lastError = error;

      // 네트워크 오류 시 재시도
      if (error.name === 'TypeError' && attempt < maxRetries) {
        const waitTime = calculateBackoff(attempt);
        console.warn(`네트워크 오류, ${waitTime}ms 후 재시도 (${attempt + 1}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Rate limit 초과: 최대 재시도 횟수 도달');
}

/**
 * OJT 콘텐츠 생성
 * @param {Object} params - 생성 파라미터
 * @param {string} params.contentText - 원본 텍스트
 * @param {string} params.title - 문서 제목
 * @param {Function} params.onProgress - 진행률 콜백
 * @param {Object} params.options - 추가 옵션
 * @returns {Promise<Object>} 생성된 OJT 콘텐츠
 */
export async function generateOJTContent({ contentText, title, onProgress, options = {} }) {
  const { stepNumber = 1, totalSteps = 1, quizCount = 20 } = options;

  if (onProgress) onProgress('AI 분석 중 (Gemini)...');

  const prompt = createOJTContentPrompt(title, contentText, { stepNumber, totalSteps, quizCount });

  try {
    const responseText = await callGeminiAPI(prompt, options);
    const result = parseJSONResponse(responseText);
    const validatedResult = validateAndFillResult(result, title, quizCount);

    validatedResult.ai_engine = 'gemini';
    return validatedResult;
  } catch (error) {
    console.warn('Gemini OJT 생성 실패:', error.message);
    throw error;
  }
}

/**
 * 퀴즈 문제 재생성
 * @param {Object} params - 재생성 파라미터
 * @param {string} params.contentText - 원본 텍스트
 * @param {Array} params.existingQuiz - 기존 퀴즈 배열
 * @param {Array<number>} params.indices - 재생성할 인덱스 배열
 * @param {Function} params.onProgress - 진행률 콜백
 * @returns {Promise<Array>} 업데이트된 퀴즈 배열
 */
export async function regenerateQuiz({ contentText, existingQuiz, indices, onProgress }) {
  const count = indices.length;

  if (onProgress) onProgress('퀴즈 재생성 중 (Gemini)...');

  // 기존 문제 목록 (중복 방지)
  const existingQuestions = existingQuiz
    .filter((_, i) => !indices.includes(i))
    .map((q) => q.question);

  const prompt = createQuizRegeneratePrompt(contentText, count, existingQuestions);

  try {
    const responseText = await callGeminiAPI(prompt, { temperature: 0.5, maxTokens: 4096 });
    const newQuestions = parseJSONArrayResponse(responseText);

    // 지정된 인덱스에 새 문제 적용
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
 * Gemini API 상태 확인
 * @returns {Promise<{online: boolean, model: string, latency?: number}>}
 */
export async function checkStatus() {
  const startTime = Date.now();

  try {
    const prompt = createHealthCheckPrompt();
    await callGeminiAPI(prompt, { maxTokens: 10 });

    return {
      online: true,
      model: GEMINI_CONFIG.MODEL,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Gemini 상태 확인 실패:', error);
    return {
      online: false,
      model: GEMINI_CONFIG.MODEL,
      error: error.message,
    };
  }
}

/**
 * URL 콘텐츠용 퀴즈만 생성 (#211)
 * URL 학습은 원본 페이지를 직접 보여주므로 섹션 없이 퀴즈만 생성
 * @param {Object} params - 생성 파라미터
 * @param {string} params.contentText - URL에서 추출한 텍스트 (퀴즈 생성용)
 * @param {string} params.title - 문서 제목
 * @param {Function} params.onProgress - 진행률 콜백
 * @param {Object} params.options - 추가 옵션
 * @returns {Promise<Object>} 생성된 퀴즈 콘텐츠 (섹션 없음)
 */
export async function generateUrlQuizOnly({ contentText, title, onProgress, options = {} }) {
  const { quizCount = 20 } = options;

  if (onProgress) onProgress('URL 퀴즈 생성 중 (Gemini)...');

  const prompt = createUrlQuizOnlyPrompt(title, contentText, quizCount);

  try {
    const responseText = await callGeminiAPI(prompt, options);
    const result = parseJSONResponse(responseText);

    // URL 콘텐츠는 섹션 없이 퀴즈만 반환
    const validatedResult = {
      title: result.title || title,
      team: result.team || '미분류',
      sections: [], // URL은 섹션 없음 - 원본 페이지 직접 표시
      quiz: (result.quiz || []).map((q, i) => normalizeQuizQuestion(q, i, title)),
    };

    // 퀴즈가 부족하면 플레이스홀더로 채움
    while (validatedResult.quiz.length < quizCount) {
      validatedResult.quiz.push(createPlaceholderQuiz(title, validatedResult.quiz.length + 1));
    }

    validatedResult.ai_engine = 'gemini';
    return validatedResult;
  } catch (error) {
    console.warn('Gemini URL 퀴즈 생성 실패:', error.message);
    throw error;
  }
}

/**
 * Gemini 설정 정보 반환
 * @returns {Object} 설정 정보
 */
export function getConfig() {
  return {
    model: GEMINI_CONFIG.MODEL,
    apiUrl: GEMINI_CONFIG.API_URL,
    hasApiKey: !!GEMINI_CONFIG.API_KEY,
  };
}

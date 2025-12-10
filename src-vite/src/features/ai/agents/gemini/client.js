/**
 * Gemini Agent - API Client
 * @agent gemini-agent
 * @description Gemini AI API 클라이언트 (OJT 콘텐츠 생성)
 */

import { GEMINI_CONFIG, CONFIG } from '@/constants';
import {
  createOJTContentPrompt,
  createQuizRegeneratePrompt,
  createHealthCheckPrompt,
} from './prompts';
import {
  parseJSONResponse,
  parseJSONArrayResponse,
  validateAndFillResult,
  normalizeQuizQuestion,
} from './parser';

/**
 * Gemini API 기본 요청
 * @param {string} prompt - 프롬프트 텍스트
 * @param {Object} options - 생성 옵션
 * @returns {Promise<string>} AI 응답 텍스트
 */
async function callGeminiAPI(prompt, options = {}) {
  const { temperature = CONFIG.AI_TEMPERATURE, maxTokens = CONFIG.AI_MAX_TOKENS } = options;

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

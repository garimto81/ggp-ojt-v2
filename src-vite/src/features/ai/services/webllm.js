// OJT Master - WebLLM Integration (Issue #30, #45, #62)
// 브라우저 내 오픈소스 LLM 실행 - Service Worker 지원

import * as webllm from '@mlc-ai/web-llm';
import { WEBLLM_CONFIG } from '@/constants';

// 싱글톤 엔진 인스턴스
let engineInstance = null;
let currentModel = null;
let loadingProgress = 0;
let isLoading = false;

// 에러 타입 상수
export const WEBLLM_ERROR_TYPES = {
  WEBGPU_NOT_SUPPORTED: 'WEBGPU_NOT_SUPPORTED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  OUT_OF_MEMORY: 'OUT_OF_MEMORY',
  MODEL_LOAD_FAILED: 'MODEL_LOAD_FAILED',
  GENERATION_FAILED: 'GENERATION_FAILED',
  UNKNOWN: 'UNKNOWN',
};

/**
 * 에러 분류 함수
 * @param {Error} error - 원본 에러
 * @returns {{type: string, message: string, fallback: string}}
 */
export function classifyWebLLMError(error) {
  const errorMsg = error.message?.toLowerCase() || '';

  if (errorMsg.includes('webgpu') || errorMsg.includes('gpu') || errorMsg.includes('adapter')) {
    return {
      type: WEBLLM_ERROR_TYPES.WEBGPU_NOT_SUPPORTED,
      message: 'WebGPU를 지원하지 않습니다.',
      fallback: 'Chrome 113+ 또는 Edge 113+를 사용해주세요.',
    };
  }

  if (
    errorMsg.includes('fetch') ||
    errorMsg.includes('network') ||
    errorMsg.includes('failed to load')
  ) {
    return {
      type: WEBLLM_ERROR_TYPES.NETWORK_ERROR,
      message: '네트워크 오류가 발생했습니다.',
      fallback: '인터넷 연결을 확인해주세요.',
    };
  }

  if (errorMsg.includes('memory') || errorMsg.includes('oom') || errorMsg.includes('out of')) {
    return {
      type: WEBLLM_ERROR_TYPES.OUT_OF_MEMORY,
      message: '메모리가 부족합니다.',
      fallback: 'Gemma 2B 모델로 전환해보세요.',
    };
  }

  if (errorMsg.includes('model') || errorMsg.includes('load')) {
    return {
      type: WEBLLM_ERROR_TYPES.MODEL_LOAD_FAILED,
      message: '모델 로드에 실패했습니다.',
      fallback: '페이지를 새로고침하거나 다른 모델을 선택해주세요.',
    };
  }

  return {
    type: WEBLLM_ERROR_TYPES.UNKNOWN,
    message: error.message || '알 수 없는 오류가 발생했습니다.',
    fallback: '페이지를 새로고침해주세요.',
  };
}

/**
 * 모델 캐시 상태 확인
 * @param {string} modelId - 모델 ID
 * @returns {Promise<{cached: boolean, size: string}>}
 */
export async function checkModelCache(modelId) {
  try {
    // IndexedDB에서 모델 캐시 확인
    const cacheStorage = await caches.open('webllm-models');
    const cachedKeys = await cacheStorage.keys();

    // 모델 ID가 캐시 키에 포함되어 있는지 확인
    const isCached = cachedKeys.some((key) => key.url.includes(modelId));

    // 모델 크기 정보 가져오기
    const modelInfo = WEBLLM_CONFIG.AVAILABLE_MODELS.find((m) => m.id === modelId);
    const size = modelInfo?.size || '알 수 없음';

    return { cached: isCached, size };
  } catch {
    // 캐시 확인 실패 시 false 반환
    return { cached: false, size: '알 수 없음' };
  }
}

/**
 * WebLLM 엔진 초기화 (싱글톤, Service Worker 지원)
 * @param {string} modelId - 사용할 모델 ID
 * @param {Function} onProgress - 로딩 진행률 콜백
 * @param {boolean} useServiceWorker - Service Worker 사용 여부
 * @returns {Promise<webllm.MLCEngine>}
 */
export async function initWebLLM(
  modelId = WEBLLM_CONFIG.DEFAULT_MODEL,
  onProgress = null,
  useServiceWorker = true
) {
  // 이미 로딩 중이면 대기
  if (isLoading) {
    return new Promise((resolve) => {
      const checkLoading = setInterval(() => {
        if (!isLoading && engineInstance) {
          clearInterval(checkLoading);
          resolve(engineInstance);
        }
      }, 500);
    });
  }

  // 이미 같은 모델이 로드되어 있으면 재사용
  if (engineInstance && currentModel === modelId) {
    return engineInstance;
  }

  isLoading = true;
  loadingProgress = 0;

  try {
    // 기존 엔진 정리
    if (engineInstance) {
      await engineInstance.unload();
      engineInstance = null;
    }

    // 진행률 콜백
    const progressCallback = (report) => {
      loadingProgress = Math.round(report.progress * 100);
      if (onProgress) {
        // 문자열로 전달 (React 렌더링 호환)
        onProgress(report.text || `모델 로딩 중... ${loadingProgress}%`);
      }
    };

    // WebLLM 엔진 생성 (Service Worker 지원)
    if (useServiceWorker && 'serviceWorker' in navigator) {
      try {
        engineInstance = await webllm.CreateServiceWorkerMLCEngine(modelId, {
          initProgressCallback: progressCallback,
        });
      } catch (swError) {
        // Service Worker 실패 시 일반 엔진으로 fallback
        console.warn('Service Worker 엔진 실패, 일반 엔진으로 전환:', swError.message);
        engineInstance = await webllm.CreateMLCEngine(modelId, {
          initProgressCallback: progressCallback,
        });
      }
    } else {
      // Service Worker 미지원 시 일반 엔진 사용
      engineInstance = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: progressCallback,
      });
    }

    currentModel = modelId;
    isLoading = false;

    return engineInstance;
  } catch (error) {
    isLoading = false;
    engineInstance = null;
    currentModel = null;

    // 에러 분류
    const classifiedError = classifyWebLLMError(error);
    const enhancedError = new Error(`WebLLM 초기화 실패: ${classifiedError.message}`);
    enhancedError.errorType = classifiedError.type;
    enhancedError.fallback = classifiedError.fallback;
    throw enhancedError;
  }
}

/**
 * WebLLM 준비 상태 간단 확인
 * @returns {boolean}
 */
export function isWebLLMReady() {
  return !!engineInstance;
}

/**
 * WebLLM 엔진 상태 확인
 * @returns {{loaded: boolean, model: string|null, progress: number}}
 */
export function getWebLLMStatus() {
  return {
    loaded: !!engineInstance,
    loading: isLoading,
    model: currentModel,
    progress: loadingProgress,
  };
}

/**
 * WebLLM으로 OJT 콘텐츠 생성 (스트리밍 지원)
 * @param {string} contentText - 원본 텍스트
 * @param {string} title - 문서 제목
 * @param {Function} onProgress - 진행률 콜백
 * @param {Function} onStream - 스트리밍 콜백 (실시간 텍스트 출력)
 * @param {AbortSignal} signal - 취소 시그널
 * @returns {Promise<Object>} - 생성된 OJT 콘텐츠
 */
export async function generateWithWebLLM(
  contentText,
  title,
  onProgress = null,
  onStream = null,
  signal = null
) {
  if (!engineInstance) {
    throw new Error('WebLLM이 초기화되지 않았습니다. 먼저 initWebLLM()을 호출하세요.');
  }

  if (onProgress) onProgress('AI 분석 중 (WebLLM)...');

  const prompt = `당신은 기업 교육 설계 전문가입니다.
다음 텍스트로 신입사원 OJT 교육 자료를 JSON 형식으로 생성하세요.

## 출력 형식 (JSON만 출력)
{
  "title": "문서 제목",
  "team": "팀명",
  "sections": [
    {"title": "섹션 제목", "content": "HTML 내용"}
  ],
  "quiz": [
    {"question": "문제", "options": ["A", "B", "C", "D"], "correct": 0}
  ]
}

## 요구사항
- sections: 4-6개 (학습목표, 핵심내용, 실무예시, 주의사항, 요약)
- quiz: 10개 (4지선다)
- content는 HTML 태그 사용 (p, ul, li, strong)

## 문서 제목: ${title}

## 입력 텍스트
${contentText.substring(0, 6000)}

JSON:`;

  try {
    // 스트리밍 모드 사용 여부 결정
    const useStreaming = !!onStream;

    if (useStreaming) {
      // 스트리밍 응답
      const completion = await engineInstance.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        temperature: WEBLLM_CONFIG.TEMPERATURE,
        max_tokens: WEBLLM_CONFIG.MAX_TOKENS,
        stream: true,
      });

      let fullResponse = '';

      for await (const chunk of completion) {
        // 취소 확인
        if (signal?.aborted) {
          throw new Error('생성이 취소되었습니다.');
        }

        const delta = chunk.choices[0]?.delta?.content || '';
        fullResponse += delta;

        // 스트리밍 콜백 호출
        if (onStream) {
          onStream(fullResponse);
        }
      }

      // JSON 파싱
      const result = parseWebLLMResponse(fullResponse);
      return validateAndFillResult(result, title);
    } else {
      // 일반 응답 (기존 방식)
      const response = await engineInstance.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        temperature: WEBLLM_CONFIG.TEMPERATURE,
        max_tokens: WEBLLM_CONFIG.MAX_TOKENS,
        response_format: { type: 'json_object' },
      });

      const responseText = response.choices[0]?.message?.content;

      if (!responseText) {
        throw new Error('AI 응답이 비어있습니다.');
      }

      // JSON 파싱
      const result = parseWebLLMResponse(responseText);

      // 퀴즈 보완
      return validateAndFillResult(result, title);
    }
  } catch (error) {
    // 에러 분류
    const classifiedError = classifyWebLLMError(error);
    const enhancedError = new Error(`WebLLM 생성 실패: ${classifiedError.message}`);
    enhancedError.errorType = classifiedError.type || WEBLLM_ERROR_TYPES.GENERATION_FAILED;
    enhancedError.fallback = classifiedError.fallback;
    console.warn('WebLLM 생성 실패:', error.message);
    throw enhancedError;
  }
}

/**
 * WebLLM 응답 파싱
 * @param {string} responseText - AI 응답 텍스트
 * @returns {Object}
 */
function parseWebLLMResponse(responseText) {
  // JSON 추출
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('JSON 형식을 찾을 수 없습니다.');
  }

  // 제어 문자 제거
  /* eslint-disable no-control-regex */
  const controlCharRegex = /[\x00-\x1F\x7F]/g;
  /* eslint-enable no-control-regex */
  const jsonStr = jsonMatch[0]
    .replace(controlCharRegex, ' ')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']');

  return JSON.parse(jsonStr);
}

/**
 * 결과 검증 및 퀴즈 보완
 * @param {Object} result - 파싱된 결과
 * @param {string} title - 문서 제목
 * @returns {Object}
 */
function validateAndFillResult(result, title) {
  // 섹션 검증
  if (!Array.isArray(result.sections) || result.sections.length === 0) {
    result.sections = [{ title: '학습 목표', content: '<p>내용을 확인해주세요.</p>' }];
  }

  // 퀴즈 검증
  if (!Array.isArray(result.quiz)) {
    result.quiz = [];
  }

  // 퀴즈 정규화
  result.quiz = result.quiz.map((q, idx) => normalizeQuizQuestion(q, idx, title));

  // 퀴즈 부족 시 더미 추가 (최소 10개)
  while (result.quiz.length < 10) {
    result.quiz.push(createPlaceholderQuiz(title, result.quiz.length + 1));
  }

  result.ai_engine = 'webllm';
  return result;
}

/**
 * 퀴즈 문제 정규화
 */
function normalizeQuizQuestion(question, index, title) {
  const normalized = { ...question };

  // 선택지 검증
  if (!Array.isArray(normalized.options) || normalized.options.length < 2) {
    normalized.options = ['정답', '오답 1', '오답 2', '오답 3'];
    normalized.correct = 0;
  }

  // 정답 인덱스 검증
  if (
    typeof normalized.correct !== 'number' ||
    normalized.correct < 0 ||
    normalized.correct >= normalized.options.length
  ) {
    normalized.correct = 0;
  }

  // 문제 텍스트 검증
  if (!normalized.question || normalized.question.trim() === '') {
    normalized.question = `${title} 관련 문제 ${index + 1}`;
  }

  normalized.answer = normalized.options[normalized.correct];
  return normalized;
}

/**
 * 더미 퀴즈 생성
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
 * WebLLM 엔진 해제
 */
export async function unloadWebLLM() {
  if (engineInstance) {
    await engineInstance.unload();
    engineInstance = null;
    currentModel = null;
    loadingProgress = 0;
  }
}

/**
 * WebGPU 지원 여부 확인
 * @returns {Promise<boolean>}
 */
export async function checkWebGPUSupport() {
  if (!navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/**
 * 사용 가능한 모델 목록 반환
 * @returns {Array<{id: string, name: string, size: string, recommended: boolean}>}
 */
export function getAvailableModels() {
  return WEBLLM_CONFIG.AVAILABLE_MODELS;
}

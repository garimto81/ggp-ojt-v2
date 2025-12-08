// OJT Master - AI Content Generator (하이브리드 엔진)
// 1순위: Local AI Server, 2순위: WebLLM, 3순위: Fallback Content

import { createFallbackContent, createPlaceholderQuiz } from './fallbackContent';

/**
 * Check AI status (Local AI + WebLLM)
 * @returns {Promise<Object>} AI status object with both engines
 */
export async function checkAIStatus() {
  const result = {
    // Local AI 서버 상태
    localAI: {
      configured: false,
      available: false,
      url: null,
      model: null,
    },
    // WebLLM 상태
    webllm: {
      supported: false,
      loaded: false,
      loading: false,
      model: null,
    },
    // 사용 가능한 최선의 엔진
    bestEngine: null,
    online: false,
  };

  // Local AI 서버 상태 확인
  try {
    const { getLocalAIStatus } = await import('./localAI.js');
    const localStatus = await getLocalAIStatus();

    result.localAI.configured = localStatus.configured;
    result.localAI.available = localStatus.available;
    result.localAI.url = localStatus.url;
    result.localAI.model = localStatus.model;

    if (localStatus.available) {
      result.bestEngine = 'local';
    }
  } catch (error) {
    console.warn('[ContentGenerator] Local AI check failed:', error.message);
  }

  // WebLLM 상태 확인
  try {
    const { checkWebGPUSupport, getWebLLMStatus } = await import('./webllm.js');

    result.webllm.supported = await checkWebGPUSupport();
    const webllmStatus = getWebLLMStatus();
    result.webllm.loaded = webllmStatus.loaded;
    result.webllm.loading = webllmStatus.loading;
    result.webllm.model = webllmStatus.model;

    if (!result.bestEngine && result.webllm.loaded) {
      result.bestEngine = 'webllm';
    }
  } catch (error) {
    console.warn('[ContentGenerator] WebLLM check failed:', error.message);
  }

  // 온라인 상태 (어느 하나라도 사용 가능하면)
  result.online = result.localAI.available || result.webllm.loaded || result.webllm.supported;

  return result;
}

/**
 * Generate OJT content using AI (Local AI → WebLLM → Fallback)
 *
 * @param {string} contentText - Raw content text
 * @param {string} title - Document title
 * @param {number} _stepNumber - Unused, for compatibility
 * @param {number} _totalSteps - Unused, for compatibility
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Generated OJT content
 */
export async function generateOJTContent(
  contentText,
  title,
  _stepNumber = 1,
  _totalSteps = 1,
  onProgress
) {
  // 1순위: Local AI 서버 시도
  try {
    const result = await generateWithLocalAIEngine(contentText, title, onProgress);
    if (result) return result;
  } catch (localError) {
    console.warn('[ContentGenerator] Local AI 생성 실패:', localError.message);
  }

  // 2순위: WebLLM 시도
  try {
    const result = await generateWithWebLLMEngine(contentText, title, onProgress);
    if (result) return result;
  } catch (webllmError) {
    console.warn('[ContentGenerator] WebLLM 생성 실패:', webllmError.message);
  }

  // 3순위: Fallback Content (원문 그대로)
  if (onProgress) onProgress('AI 분석 실패 - 원문으로 등록 중...');
  return createFallbackContent(contentText, title, 'AI 엔진을 사용할 수 없습니다.');
}

/**
 * Generate content using Local AI Server
 * @private
 */
async function generateWithLocalAIEngine(contentText, title, onProgress) {
  const { checkLocalAIAvailable, generateOJTWithLocalAI } = await import('./localAI.js');

  // Local AI 서버 사용 가능 확인
  const available = await checkLocalAIAvailable();
  if (!available) {
    throw new Error('Local AI server not available');
  }

  // Local AI로 생성
  const result = await generateOJTWithLocalAI(contentText, title, onProgress);

  // 퀴즈 10개 미만이면 더미로 채움
  if (result.quiz.length < 10) {
    const dummyQuizzes = createPlaceholderQuiz(10 - result.quiz.length, title);
    result.quiz = [...result.quiz, ...dummyQuizzes];
  }

  return result;
}

/**
 * Generate content using WebLLM (Open Source LLM)
 * @private
 */
async function generateWithWebLLMEngine(contentText, title, onProgress) {
  const { checkWebGPUSupport, getWebLLMStatus, initWebLLM, generateWithWebLLM } =
    await import('./webllm.js');

  // WebGPU 지원 확인
  const webgpuSupported = await checkWebGPUSupport();
  if (!webgpuSupported) {
    throw new Error('WebGPU not supported');
  }

  // WebLLM 상태 확인 및 초기화
  const status = getWebLLMStatus();
  if (!status.loaded) {
    if (onProgress) onProgress('WebLLM 모델 로딩 중... (최초 실행 시 2-3분 소요)');
    await initWebLLM(undefined, (progress) => {
      if (onProgress) onProgress(progress);
    });
  }

  if (onProgress) onProgress('WebLLM으로 콘텐츠 생성 중...');

  // WebLLM으로 생성
  const result = await generateWithWebLLM(contentText, title, onProgress);

  if (onProgress) onProgress('콘텐츠 생성 완료! (WebLLM)');
  return result;
}

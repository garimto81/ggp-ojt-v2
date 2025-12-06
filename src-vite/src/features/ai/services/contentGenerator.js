// OJT Master - AI Content Generator (Issue #59)
// WebLLM 기반 콘텐츠 생성

import { createFallbackContent } from './fallbackContent';

/**
 * Check WebLLM AI status
 * @returns {Promise<{online: boolean, model: string|null, loaded: boolean}>}
 */
export async function checkAIStatus() {
  try {
    const { getWebLLMStatus, checkWebGPUSupport } = await import('./webllm.js');
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
 * @param {number} _stepNumber - Current step number (unused, for compatibility)
 * @param {number} _totalSteps - Total number of steps (unused, for compatibility)
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
  try {
    const { generateWithWebLLM, getWebLLMStatus } = await import('./webllm.js');
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

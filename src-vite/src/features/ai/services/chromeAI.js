// OJT Master - Chrome Prompt API Integration (Issue #96)
// Chrome 138+ 내장 Gemini Nano 모델 사용

/**
 * Chrome AI 엔진 타입
 */
export const CHROME_AI_STATUS = {
  NOT_SUPPORTED: 'not_supported', // 브라우저 미지원
  NOT_DOWNLOADED: 'not_downloaded', // 모델 다운로드 필요
  DOWNLOADING: 'downloading', // 다운로드 중
  READY: 'ready', // 사용 가능
};

/**
 * Chrome AI 에러 타입
 */
export const CHROME_AI_ERROR_TYPES = {
  NOT_SUPPORTED: 'CHROME_AI_NOT_SUPPORTED',
  DOWNLOAD_FAILED: 'CHROME_AI_DOWNLOAD_FAILED',
  SESSION_FAILED: 'CHROME_AI_SESSION_FAILED',
  GENERATION_FAILED: 'CHROME_AI_GENERATION_FAILED',
};

// 싱글톤 세션 인스턴스
let sessionInstance = null;
let currentStatus = CHROME_AI_STATUS.NOT_SUPPORTED;

/**
 * Chrome Prompt API 지원 여부 확인
 * @returns {Promise<boolean>}
 */
export async function checkChromeAISupport() {
  try {
    // window.ai.languageModel 존재 여부 확인
    if (!window.ai?.languageModel) {
      console.log('[ChromeAI] window.ai.languageModel not available');
      return false;
    }

    // capabilities 확인
    const capabilities = await window.ai.languageModel.capabilities();
    console.log('[ChromeAI] Capabilities:', capabilities);

    if (capabilities.available === 'no') {
      currentStatus = CHROME_AI_STATUS.NOT_SUPPORTED;
      return false;
    }

    if (capabilities.available === 'after-download') {
      currentStatus = CHROME_AI_STATUS.NOT_DOWNLOADED;
      return true; // 지원하지만 다운로드 필요
    }

    if (capabilities.available === 'readily') {
      currentStatus = CHROME_AI_STATUS.READY;
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[ChromeAI] Support check failed:', error);
    return false;
  }
}

/**
 * Chrome AI 현재 상태 조회
 * @returns {Promise<string>}
 */
export async function getChromeAIStatus() {
  await checkChromeAISupport();
  return currentStatus;
}

/**
 * Chrome AI 세션 생성/획득
 * @param {Object} options - 세션 옵션
 * @returns {Promise<Object>} 세션 인스턴스
 */
export async function createChromeAISession(options = {}) {
  if (sessionInstance) {
    return sessionInstance;
  }

  const isSupported = await checkChromeAISupport();
  if (!isSupported) {
    const error = new Error('Chrome AI (Gemini Nano)를 지원하지 않습니다. Chrome 138+ 필요.');
    error.errorType = CHROME_AI_ERROR_TYPES.NOT_SUPPORTED;
    throw error;
  }

  try {
    console.log('[ChromeAI] Creating session...');

    // 세션 생성 옵션
    const sessionOptions = {
      temperature: options.temperature ?? 0.3,
      topK: options.topK ?? 40,
      ...options,
    };

    // 다운로드 진행률 모니터 (다운로드 필요한 경우)
    if (currentStatus === CHROME_AI_STATUS.NOT_DOWNLOADED) {
      currentStatus = CHROME_AI_STATUS.DOWNLOADING;

      sessionOptions.monitor = (monitor) => {
        monitor.addEventListener('downloadprogress', (e) => {
          const progress = Math.round((e.loaded / e.total) * 100);
          console.log(`[ChromeAI] Download progress: ${progress}%`);
          // 콜백이 있으면 호출
          if (options.onProgress) {
            options.onProgress(progress);
          }
        });
      };
    }

    sessionInstance = await window.ai.languageModel.create(sessionOptions);
    currentStatus = CHROME_AI_STATUS.READY;

    console.log('[ChromeAI] Session created successfully');
    return sessionInstance;
  } catch (error) {
    console.error('[ChromeAI] Session creation failed:', error);
    const wrappedError = new Error(`Chrome AI 세션 생성 실패: ${error.message}`);
    wrappedError.errorType = CHROME_AI_ERROR_TYPES.SESSION_FAILED;
    throw wrappedError;
  }
}

/**
 * Chrome AI로 텍스트 생성
 * @param {string} prompt - 프롬프트
 * @param {Object} options - 옵션
 * @returns {Promise<string>} 생성된 텍스트
 */
export async function generateWithChromeAI(prompt, options = {}) {
  try {
    const session = await createChromeAISession(options);

    console.log('[ChromeAI] Generating response...');
    const response = await session.prompt(prompt);

    console.log('[ChromeAI] Response generated, length:', response.length);
    return response;
  } catch (error) {
    console.error('[ChromeAI] Generation failed:', error);

    if (error.errorType) {
      throw error;
    }

    const wrappedError = new Error(`Chrome AI 생성 실패: ${error.message}`);
    wrappedError.errorType = CHROME_AI_ERROR_TYPES.GENERATION_FAILED;
    throw wrappedError;
  }
}

/**
 * Chrome AI 스트리밍 생성
 * @param {string} prompt - 프롬프트
 * @param {Function} onChunk - 청크 콜백
 * @param {Object} options - 옵션
 * @returns {Promise<string>} 전체 생성된 텍스트
 */
export async function streamWithChromeAI(prompt, onChunk, options = {}) {
  try {
    const session = await createChromeAISession(options);

    console.log('[ChromeAI] Starting stream...');
    const stream = await session.promptStreaming(prompt);

    let fullResponse = '';
    for await (const chunk of stream) {
      fullResponse = chunk; // 누적된 전체 텍스트
      if (onChunk) {
        onChunk(chunk);
      }
    }

    console.log('[ChromeAI] Stream completed, length:', fullResponse.length);
    return fullResponse;
  } catch (error) {
    console.error('[ChromeAI] Stream failed:', error);

    if (error.errorType) {
      throw error;
    }

    const wrappedError = new Error(`Chrome AI 스트리밍 실패: ${error.message}`);
    wrappedError.errorType = CHROME_AI_ERROR_TYPES.GENERATION_FAILED;
    throw wrappedError;
  }
}

/**
 * Chrome AI 세션 종료
 */
export async function destroyChromeAISession() {
  if (sessionInstance) {
    try {
      await sessionInstance.destroy();
      console.log('[ChromeAI] Session destroyed');
    } catch (error) {
      console.warn('[ChromeAI] Session destroy failed:', error);
    }
    sessionInstance = null;
  }
}

/**
 * Chrome AI 사용 가능 여부 (즉시 사용 가능한지)
 * @returns {Promise<boolean>}
 */
export async function isChromeAIReady() {
  const status = await getChromeAIStatus();
  return status === CHROME_AI_STATUS.READY;
}

/**
 * Chrome AI 정보 조회
 * @returns {Promise<Object>}
 */
export async function getChromeAIInfo() {
  const isSupported = await checkChromeAISupport();

  if (!isSupported) {
    return {
      supported: false,
      status: currentStatus,
      model: null,
      capabilities: null,
    };
  }

  try {
    const capabilities = await window.ai.languageModel.capabilities();
    return {
      supported: true,
      status: currentStatus,
      model: 'Gemini Nano',
      capabilities: {
        available: capabilities.available,
        defaultTemperature: capabilities.defaultTemperature,
        defaultTopK: capabilities.defaultTopK,
        maxTopK: capabilities.maxTopK,
      },
    };
  } catch (error) {
    return {
      supported: false,
      status: currentStatus,
      model: null,
      capabilities: null,
      error: error.message,
    };
  }
}

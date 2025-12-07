// OJT Master - AI Context (Hybrid: Chrome AI + WebLLM, Issue #96)
// 브라우저 내 AI 엔진 상태 관리 - Chrome AI 우선, WebLLM 폴백
/**
 * ROLE: Context API - Client State Management
 *
 * PURPOSE:
 * - 브라우저 내 AI 엔진 상태 관리 (전역 클라이언트 상태)
 * - Chrome AI (Gemini Nano) 우선, WebLLM 폴백 전략
 * - 모델 로딩, 언로드, 진행률, 에러 상태 추적
 *
 * RESPONSIBILITY:
 * ✅ AI 엔진 상태 (loaded, loading, progress, error)
 * ✅ Chrome AI 지원 여부 및 상태 관리
 * ✅ WebLLM 폴백 지원 (WebGPU 필요)
 * ✅ 자동 엔진 선택 (chromeai > webllm)
 *
 * NOT RESPONSIBLE FOR:
 * ❌ AI 콘텐츠 생성 로직 → contentGenerator 서비스 사용
 * ❌ 생성된 문서 저장 → useDocs mutation 사용
 * ❌ 서버 데이터 관리 → React Query 사용
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WEBLLM_CONFIG, AI_ENGINE_CONFIG, CHROME_AI_CONFIG } from '@/constants';
import {
  initWebLLM,
  getWebLLMStatus,
  unloadWebLLM,
  checkWebGPUSupport,
  getAvailableModels,
  checkModelCache,
  WEBLLM_ERROR_TYPES,
} from '@features/ai/services/webllm';
import {
  checkChromeAISupport,
  getChromeAIStatus,
  getChromeAIInfo,
  createChromeAISession,
  destroyChromeAISession,
  CHROME_AI_STATUS,
  CHROME_AI_ERROR_TYPES,
} from '@features/ai/services/chromeAI';

const AIContext = createContext(null);

export function AIProvider({ children }) {
  // 현재 활성 엔진 ('auto', 'chromeai', 'webllm')
  const [activeEngine, setActiveEngine] = useState(AI_ENGINE_CONFIG.DEFAULT_ENGINE);

  // Chrome AI 상태
  const [chromeAIStatus, setChromeAIStatus] = useState({
    supported: null, // null = 확인 중, true/false
    status: CHROME_AI_STATUS.NOT_SUPPORTED,
    loaded: false,
    loading: false,
    error: null,
    errorType: null,
  });

  // WebLLM 상태
  const [webllmStatus, setWebllmStatus] = useState({
    loaded: false,
    loading: false,
    model: null,
    progress: 0,
    error: null,
    errorType: null,
    fallback: null,
  });

  // WebGPU 지원 여부
  const [webgpuSupported, setWebgpuSupported] = useState(null);

  // 선택된 WebLLM 모델
  const [selectedModel, setSelectedModel] = useState(WEBLLM_CONFIG.DEFAULT_MODEL);

  // 모델 캐시 상태
  const [modelCacheStatus, setModelCacheStatus] = useState({});

  // 초기화: 엔진 지원 여부 확인
  useEffect(() => {
    const initEngineSupport = async () => {
      // 1. Chrome AI 지원 확인 (우선)
      try {
        const chromeSupported = await checkChromeAISupport();
        const chromeInfo = await getChromeAIInfo();

        setChromeAIStatus((prev) => ({
          ...prev,
          supported: chromeSupported,
          status: chromeInfo.status,
        }));

        console.log('[AIContext] Chrome AI support:', chromeSupported, chromeInfo);
      } catch (error) {
        console.warn('[AIContext] Chrome AI check failed:', error);
        setChromeAIStatus((prev) => ({
          ...prev,
          supported: false,
          status: CHROME_AI_STATUS.NOT_SUPPORTED,
        }));
      }

      // 2. WebGPU 지원 확인 (폴백용)
      const webgpu = await checkWebGPUSupport();
      setWebgpuSupported(webgpu);

      // 3. WebLLM 모델 캐시 상태 확인
      const models = getAvailableModels();
      const cacheStatus = {};
      for (const model of models) {
        const status = await checkModelCache(model.id);
        cacheStatus[model.id] = status;
      }
      setModelCacheStatus(cacheStatus);
    };

    initEngineSupport();
  }, []);

  /**
   * 현재 사용 가능한 최적의 엔진 결정
   * 우선순위: Chrome AI (ready) > WebLLM
   */
  const getBestAvailableEngine = useCallback(() => {
    // Chrome AI가 ready 상태면 우선 사용
    if (chromeAIStatus.supported && chromeAIStatus.status === CHROME_AI_STATUS.READY) {
      return AI_ENGINE_CONFIG.ENGINES.CHROME_AI;
    }
    // Chrome AI 다운로드 필요하면 WebLLM 우선 (대기 시간 고려)
    if (chromeAIStatus.status === CHROME_AI_STATUS.NOT_DOWNLOADED && webgpuSupported) {
      return AI_ENGINE_CONFIG.ENGINES.WEBLLM;
    }
    // WebGPU 지원하면 WebLLM
    if (webgpuSupported) {
      return AI_ENGINE_CONFIG.ENGINES.WEBLLM;
    }
    // Chrome AI 다운로드 필요하면 그것이라도
    if (chromeAIStatus.supported) {
      return AI_ENGINE_CONFIG.ENGINES.CHROME_AI;
    }
    // 둘 다 안되면 null
    return null;
  }, [chromeAIStatus, webgpuSupported]);

  /**
   * Chrome AI 세션 초기화
   */
  const loadChromeAI = useCallback(async () => {
    if (chromeAIStatus.loading) return;

    if (!chromeAIStatus.supported) {
      const error = new Error(
        `Chrome AI (${CHROME_AI_CONFIG.MODEL_NAME})를 지원하지 않습니다. Chrome ${CHROME_AI_CONFIG.MIN_CHROME_VERSION}+ 필요.`
      );
      error.errorType = CHROME_AI_ERROR_TYPES.NOT_SUPPORTED;
      throw error;
    }

    setChromeAIStatus((prev) => ({
      ...prev,
      loading: true,
      error: null,
      errorType: null,
    }));

    try {
      await createChromeAISession({
        temperature: CHROME_AI_CONFIG.TEMPERATURE,
        topK: CHROME_AI_CONFIG.TOP_K,
        onProgress: (progress) => {
          console.log(`[AIContext] Chrome AI download: ${progress}%`);
        },
      });

      setChromeAIStatus((prev) => ({
        ...prev,
        loaded: true,
        loading: false,
        status: CHROME_AI_STATUS.READY,
        error: null,
        errorType: null,
      }));

      setActiveEngine(AI_ENGINE_CONFIG.ENGINES.CHROME_AI);
      console.log('[AIContext] Chrome AI loaded successfully');
    } catch (error) {
      setChromeAIStatus((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
        errorType: error.errorType || CHROME_AI_ERROR_TYPES.SESSION_FAILED,
      }));
      throw error;
    }
  }, [chromeAIStatus.supported, chromeAIStatus.loading]);

  /**
   * WebLLM 모델 로딩
   * @param {string} modelId - 모델 ID (선택)
   */
  const loadWebLLM = useCallback(
    async (modelId = selectedModel) => {
      if (webllmStatus.loading) return;

      // WebGPU 미지원 시 에러
      if (!webgpuSupported) {
        const error = new Error(
          '이 브라우저는 WebGPU를 지원하지 않습니다. Chrome 113+ 또는 Edge 113+가 필요합니다.'
        );
        error.errorType = WEBLLM_ERROR_TYPES.WEBGPU_NOT_SUPPORTED;
        error.fallback = 'Chrome 113+ 또는 Edge 113+를 사용해주세요.';
        throw error;
      }

      setWebllmStatus((prev) => ({
        ...prev,
        loading: true,
        error: null,
        errorType: null,
        fallback: null,
      }));

      try {
        await initWebLLM(
          modelId,
          (progressText) => {
            const match = progressText.match(/(\d+)%/);
            const progress = match ? parseInt(match[1], 10) : 0;
            setWebllmStatus((prev) => ({
              ...prev,
              progress,
            }));
          },
          true
        );

        setWebllmStatus({
          loaded: true,
          loading: false,
          model: modelId,
          progress: 100,
          error: null,
          errorType: null,
          fallback: null,
        });

        setSelectedModel(modelId);
        setActiveEngine(AI_ENGINE_CONFIG.ENGINES.WEBLLM);

        // 캐시 상태 업데이트
        const cacheStatus = await checkModelCache(modelId);
        setModelCacheStatus((prev) => ({
          ...prev,
          [modelId]: cacheStatus,
        }));

        console.log('[AIContext] WebLLM loaded successfully:', modelId);
      } catch (error) {
        setWebllmStatus((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
          errorType: error.errorType || WEBLLM_ERROR_TYPES.UNKNOWN,
          fallback: error.fallback || '페이지를 새로고침해주세요.',
        }));
        throw error;
      }
    },
    [selectedModel, webllmStatus.loading, webgpuSupported]
  );

  /**
   * 자동 엔진 로드 (최적의 엔진 선택)
   */
  const loadBestEngine = useCallback(async () => {
    const bestEngine = getBestAvailableEngine();

    if (!bestEngine) {
      throw new Error(
        '사용 가능한 AI 엔진이 없습니다. Chrome 138+ 또는 WebGPU 지원 브라우저가 필요합니다.'
      );
    }

    if (bestEngine === AI_ENGINE_CONFIG.ENGINES.CHROME_AI) {
      return loadChromeAI();
    } else {
      return loadWebLLM();
    }
  }, [getBestAvailableEngine, loadChromeAI, loadWebLLM]);

  /**
   * 현재 엔진 언로드
   */
  const unloadModel = useCallback(async () => {
    // Chrome AI 세션 종료
    await destroyChromeAISession();
    setChromeAIStatus((prev) => ({
      ...prev,
      loaded: false,
    }));

    // WebLLM 언로드
    await unloadWebLLM();
    setWebllmStatus({
      loaded: false,
      loading: false,
      model: null,
      progress: 0,
      error: null,
      errorType: null,
      fallback: null,
    });

    setActiveEngine(AI_ENGINE_CONFIG.DEFAULT_ENGINE);
  }, []);

  /**
   * 현재 상태 갱신
   */
  const refreshStatus = useCallback(async () => {
    // Chrome AI 상태 갱신
    const chromeStatus = await getChromeAIStatus();
    setChromeAIStatus((prev) => ({
      ...prev,
      status: chromeStatus,
    }));

    // WebLLM 상태 갱신
    const webllm = getWebLLMStatus();
    setWebllmStatus((prev) => ({
      ...prev,
      loaded: webllm.loaded,
      loading: webllm.loading,
      model: webllm.model,
      progress: webllm.progress,
    }));
  }, []);

  // 현재 엔진이 로드되었는지 확인
  const isAnyEngineLoaded = chromeAIStatus.loaded || webllmStatus.loaded;
  const isAnyEngineLoading = chromeAIStatus.loading || webllmStatus.loading;

  // 현재 활성 엔진 정보
  const currentEngine = chromeAIStatus.loaded
    ? AI_ENGINE_CONFIG.ENGINES.CHROME_AI
    : webllmStatus.loaded
      ? AI_ENGINE_CONFIG.ENGINES.WEBLLM
      : null;

  const value = {
    // 엔진 타입
    engine: currentEngine,
    activeEngine,
    setActiveEngine,

    // Chrome AI 상태
    chromeAIStatus,
    chromeAISupported: chromeAIStatus.supported,

    // WebLLM 상태
    webllmStatus,
    webgpuSupported,

    // 통합 상태
    isAnyEngineLoaded,
    isAnyEngineLoading,

    // 엔진 로딩 함수들
    loadChromeAI,
    loadWebLLM,
    loadBestEngine,
    unloadModel,

    // 상태 갱신
    refreshStatus,

    // 최적 엔진 조회
    getBestAvailableEngine,

    // WebLLM 모델 관련
    selectedModel,
    setSelectedModel,
    availableModels: getAvailableModels(),
    modelCacheStatus,

    // 에러 타입 상수
    WEBLLM_ERROR_TYPES,
    CHROME_AI_ERROR_TYPES,
    CHROME_AI_STATUS,

    // 설정
    AI_ENGINE_CONFIG,
    CHROME_AI_CONFIG,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

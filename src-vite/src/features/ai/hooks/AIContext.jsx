// OJT Master - AI Context (WebLLM Only, Issue #62)
// 브라우저 내 AI 엔진 상태 관리 - Service Worker 지원
/**
 * ROLE: Context API - Client State Management
 *
 * PURPOSE:
 * - 브라우저 내 WebLLM 엔진 상태 관리 (전역 클라이언트 상태)
 * - 모델 로딩, 언로드, 진행률, 에러 상태 추적
 * - WebGPU 지원 여부 및 모델 캐시 상태 관리
 *
 * RESPONSIBILITY:
 * ✅ WebLLM 엔진 상태 (loaded, loading, progress, error)
 * ✅ 선택된 모델 및 사용 가능한 모델 목록
 * ✅ WebGPU 지원 여부 확인
 * ✅ 모델 캐시 상태 (IndexedDB 캐시 여부)
 * ✅ 모델 로딩/언로드 액션
 *
 * NOT RESPONSIBLE FOR:
 * ❌ AI 콘텐츠 생성 로직 → contentGenerator 서비스 사용
 * ❌ 생성된 문서 저장 → useDocs mutation 사용
 * ❌ 서버 데이터 관리 → React Query 사용
 *
 * WHY CONTEXT:
 * - WebLLM은 브라우저 내에서만 동작하는 클라이언트 전용 상태
 * - 서버와 무관하며, 앱 전체에서 공유되는 싱글톤 엔진
 * - 실시간 진행률 업데이트 필요 (캐싱 불필요)
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WEBLLM_CONFIG } from '@/constants';
import {
  initWebLLM,
  getWebLLMStatus,
  unloadWebLLM,
  checkWebGPUSupport,
  getAvailableModels,
  checkModelCache,
  WEBLLM_ERROR_TYPES,
} from '@features/ai/services/webllm';

const AIContext = createContext(null);

export function AIProvider({ children }) {
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

  // WebGPU 지원 확인 및 캐시 상태 확인
  useEffect(() => {
    checkWebGPUSupport().then(setWebgpuSupported);

    // 각 모델의 캐시 상태 확인
    const checkAllModelCaches = async () => {
      const models = getAvailableModels();
      const cacheStatus = {};
      for (const model of models) {
        const status = await checkModelCache(model.id);
        cacheStatus[model.id] = status;
      }
      setModelCacheStatus(cacheStatus);
    };
    checkAllModelCaches();
  }, []);

  /**
   * WebLLM 모델 로딩 (Service Worker 지원)
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
        // Service Worker 사용하여 모델 로드
        await initWebLLM(
          modelId,
          (progressText) => {
            // 문자열에서 progress 추출 (예: "모델 로딩 중... 50%")
            const match = progressText.match(/(\d+)%/);
            const progress = match ? parseInt(match[1], 10) : 0;
            setWebllmStatus((prev) => ({
              ...prev,
              progress,
            }));
          },
          true
        ); // useServiceWorker = true

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

        // 캐시 상태 업데이트
        const cacheStatus = await checkModelCache(modelId);
        setModelCacheStatus((prev) => ({
          ...prev,
          [modelId]: cacheStatus,
        }));
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
   * WebLLM 언로드
   */
  const unloadModel = useCallback(async () => {
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
  }, []);

  /**
   * 현재 WebLLM 상태 갱신
   */
  const refreshStatus = useCallback(() => {
    const status = getWebLLMStatus();
    setWebllmStatus((prev) => ({
      ...prev,
      loaded: status.loaded,
      loading: status.loading,
      model: status.model,
      progress: status.progress,
    }));
  }, []);

  const value = {
    // WebLLM 전용 (engine 항상 'webllm')
    engine: 'webllm',
    // WebLLM 상태
    webllmStatus,
    // WebGPU 지원 여부
    webgpuSupported,
    // WebLLM 모델 로딩
    loadWebLLM,
    // WebLLM 언로드
    unloadModel,
    // 상태 갱신
    refreshStatus,
    // 선택된 모델
    selectedModel,
    setSelectedModel,
    // 사용 가능한 모델 목록
    availableModels: getAvailableModels(),
    // 모델 캐시 상태 (Issue #62)
    modelCacheStatus,
    // 에러 타입 상수
    WEBLLM_ERROR_TYPES,
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

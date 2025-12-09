// OJT Master - AI Context (Issue #30, #45)
// AI 엔진 상태 관리 (Gemini / WebLLM)
// @agent ai-agent

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AI_ENGINE_CONFIG, WEBLLM_CONFIG } from '@/constants';
import {
  initWebLLM,
  getWebLLMStatus,
  unloadWebLLM,
  checkWebGPUSupport,
  getAvailableModels,
} from '@/utils/webllm';

const AIContext = createContext(null);

export function AIProvider({ children }) {
  // AI 엔진 상태
  const [engine, setEngine] = useState(() => {
    // 로컬 스토리지에서 이전 선택 복원
    const saved = localStorage.getItem(AI_ENGINE_CONFIG.STORAGE_KEY);
    return saved || AI_ENGINE_CONFIG.DEFAULT_ENGINE;
  });

  // WebLLM 상태
  const [webllmStatus, setWebllmStatus] = useState({
    loaded: false,
    loading: false,
    model: null,
    progress: 0,
    error: null,
  });

  // WebGPU 지원 여부
  const [webgpuSupported, setWebgpuSupported] = useState(null);

  // 선택된 WebLLM 모델
  const [selectedModel, setSelectedModel] = useState(WEBLLM_CONFIG.DEFAULT_MODEL);

  // WebGPU 지원 확인
  useEffect(() => {
    checkWebGPUSupport().then(setWebgpuSupported);
  }, []);

  // 엔진 선택 저장
  useEffect(() => {
    localStorage.setItem(AI_ENGINE_CONFIG.STORAGE_KEY, engine);
  }, [engine]);

  /**
   * AI 엔진 전환
   * @param {'gemini' | 'webllm'} newEngine
   */
  const switchEngine = useCallback(
    async (newEngine) => {
      if (newEngine === engine) return;

      // WebLLM으로 전환 시 WebGPU 확인
      if (newEngine === 'webllm' && !webgpuSupported) {
        throw new Error(
          '이 브라우저는 WebGPU를 지원하지 않습니다. Chrome 113+ 또는 Edge 113+가 필요합니다.'
        );
      }

      // 기존 WebLLM 해제
      if (engine === 'webllm' && newEngine === 'gemini') {
        await unloadWebLLM();
        setWebllmStatus({
          loaded: false,
          loading: false,
          model: null,
          progress: 0,
          error: null,
        });
      }

      setEngine(newEngine);
    },
    [engine, webgpuSupported]
  );

  /**
   * WebLLM 모델 로딩
   * @param {string} modelId - 모델 ID (선택)
   */
  const loadWebLLM = useCallback(
    async (modelId = selectedModel) => {
      if (webllmStatus.loading) return;

      setWebllmStatus((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        await initWebLLM(modelId, (report) => {
          setWebllmStatus((prev) => ({
            ...prev,
            progress: report.progress,
          }));
        });

        setWebllmStatus({
          loaded: true,
          loading: false,
          model: modelId,
          progress: 100,
          error: null,
        });

        setSelectedModel(modelId);
      } catch (error) {
        setWebllmStatus((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        throw error;
      }
    },
    [selectedModel, webllmStatus.loading]
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
    // 현재 선택된 엔진
    engine,
    // 엔진 전환
    switchEngine,
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
    // Fallback 활성화 여부
    fallbackEnabled: AI_ENGINE_CONFIG.FALLBACK_ENABLED,
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

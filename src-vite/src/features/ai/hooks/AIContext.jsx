// OJT Master - AI Context (Local AI + WebLLM, Issue #101)
// 우선순위: Local AI (vLLM) → WebLLM

/**
 * ROLE: Context API - Client State Management
 *
 * PURPOSE:
 * - AI 엔진 상태 관리 (Local AI + WebLLM)
 * - 자동 엔진 선택 및 상태 추적
 *
 * RESPONSIBILITY:
 * ✅ Local AI 서버 연결 상태
 * ✅ WebLLM fallback 상태
 * ✅ 현재 사용 중인 엔진 정보
 *
 * NOT RESPONSIBLE FOR:
 * ❌ AI 콘텐츠 생성 로직 → contentGenerator 서비스 사용
 * ❌ 생성된 문서 저장 → useDocs mutation 사용
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AI_ENGINE_CONFIG, LOCAL_AI_CONFIG, WEBLLM_CONFIG } from '@/constants';
import { getLocalAIStatus } from '@features/ai/services/localAI';

const AIContext = createContext(null);

// AI 엔진 상태 상수
export const AI_STATUS = {
  CHECKING: 'checking',
  LOCAL_AI_READY: 'local_ai_ready',
  WEBLLM_READY: 'webllm_ready',
  WEBLLM_LOADING: 'webllm_loading',
  NO_ENGINE: 'no_engine',
};

export function AIProvider({ children }) {
  // AI 상태
  const [aiStatus, setAiStatus] = useState({
    status: AI_STATUS.CHECKING,
    engine: null, // 'localai' | 'webllm' | null
    localAI: {
      available: false,
      url: null,
      model: null,
    },
    webllm: {
      ready: false,
      loading: false,
      model: null,
    },
    error: null,
  });

  // 초기화: AI 엔진 상태 확인
  useEffect(() => {
    const checkEngines = async () => {
      try {
        // 1. Local AI 확인
        const localStatus = await getLocalAIStatus();

        if (localStatus.available) {
          setAiStatus({
            status: AI_STATUS.LOCAL_AI_READY,
            engine: 'localai',
            localAI: {
              available: true,
              url: localStatus.url,
              model: localStatus.model,
            },
            webllm: { ready: false, loading: false, model: null },
            error: null,
          });
          console.log('[AIContext] Local AI 사용:', localStatus.url);
          return;
        }

        // 2. WebLLM 확인 (Local AI 미사용 시)
        try {
          const { isWebLLMReady } = await import('@features/ai/services/webllm.js');
          const webllmReady = isWebLLMReady(); // sync 함수

          setAiStatus({
            status: webllmReady ? AI_STATUS.WEBLLM_READY : AI_STATUS.NO_ENGINE,
            engine: webllmReady ? 'webllm' : null,
            localAI: { available: false, url: null, model: null },
            webllm: {
              ready: webllmReady,
              loading: false,
              model: webllmReady ? WEBLLM_CONFIG.DEFAULT_MODEL : null,
            },
            error: null,
          });
          console.log('[AIContext] WebLLM:', webllmReady ? '준비됨' : '로딩 필요');
        } catch (webllmError) {
          console.warn('[AIContext] WebLLM 확인 실패:', webllmError);
          setAiStatus({
            status: AI_STATUS.NO_ENGINE,
            engine: null,
            localAI: { available: false, url: null, model: null },
            webllm: { ready: false, loading: false, model: null },
            error: 'AI 엔진을 사용할 수 없습니다.',
          });
        }
      } catch (error) {
        console.error('[AIContext] AI 확인 실패:', error);
        setAiStatus((prev) => ({
          ...prev,
          status: AI_STATUS.NO_ENGINE,
          error: error.message,
        }));
      }
    };

    checkEngines();
  }, []);

  /**
   * WebLLM 로드 (Local AI 미사용 시)
   */
  const loadWebLLM = useCallback(
    async (onProgress) => {
      if (aiStatus.webllm.ready || aiStatus.webllm.loading) return;
      if (aiStatus.localAI.available) return; // Local AI 있으면 불필요

      setAiStatus((prev) => ({
        ...prev,
        status: AI_STATUS.WEBLLM_LOADING,
        webllm: { ...prev.webllm, loading: true },
      }));

      try {
        const { initWebLLM } = await import('@features/ai/services/webllm.js');
        await initWebLLM(onProgress);

        setAiStatus((prev) => ({
          ...prev,
          status: AI_STATUS.WEBLLM_READY,
          engine: 'webllm',
          webllm: {
            ready: true,
            loading: false,
            model: WEBLLM_CONFIG.DEFAULT_MODEL,
          },
          error: null,
        }));
        console.log('[AIContext] WebLLM 로드 완료');
      } catch (error) {
        setAiStatus((prev) => ({
          ...prev,
          status: AI_STATUS.NO_ENGINE,
          webllm: { ...prev.webllm, loading: false },
          error: error.message,
        }));
        throw error;
      }
    },
    [aiStatus.webllm.ready, aiStatus.webllm.loading, aiStatus.localAI.available]
  );

  /**
   * 상태 새로고침
   */
  const refreshStatus = useCallback(async () => {
    setAiStatus((prev) => ({ ...prev, status: AI_STATUS.CHECKING }));

    const localStatus = await getLocalAIStatus();

    if (localStatus.available) {
      setAiStatus({
        status: AI_STATUS.LOCAL_AI_READY,
        engine: 'localai',
        localAI: {
          available: true,
          url: localStatus.url,
          model: localStatus.model,
        },
        webllm: { ready: false, loading: false, model: null },
        error: null,
      });
    } else {
      // WebLLM 상태 유지
      setAiStatus((prev) => ({
        ...prev,
        status: prev.webllm.ready ? AI_STATUS.WEBLLM_READY : AI_STATUS.NO_ENGINE,
        engine: prev.webllm.ready ? 'webllm' : null,
        localAI: { available: false, url: null, model: null },
      }));
    }
  }, []);

  // 편의 속성
  const isReady =
    aiStatus.status === AI_STATUS.LOCAL_AI_READY || aiStatus.status === AI_STATUS.WEBLLM_READY;
  const isLoading =
    aiStatus.status === AI_STATUS.CHECKING || aiStatus.status === AI_STATUS.WEBLLM_LOADING;

  // MentorDashboard 호환용 webllmStatus (loaded 속성 제공)
  // Local AI 사용 시에도 loaded=true로 처리하여 콘텐츠 생성 허용
  const webllmStatus = {
    loaded: aiStatus.localAI.available || aiStatus.webllm.ready,
    loading: aiStatus.webllm.loading,
    model: aiStatus.webllm.model,
    progress: 0,
  };

  const value = {
    // 상태
    aiStatus,
    webllmStatus, // MentorDashboard 호환용
    isReady,
    isLoading,
    error: aiStatus.error,
    currentEngine: aiStatus.engine,
    currentModel: aiStatus.localAI.model || aiStatus.webllm.model,

    // 액션
    loadWebLLM,
    refreshStatus,

    // 상수
    AI_STATUS,
    AI_ENGINE_CONFIG,
    LOCAL_AI_CONFIG,
    WEBLLM_CONFIG,
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

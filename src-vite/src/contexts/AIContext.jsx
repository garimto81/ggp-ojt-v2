// OJT Master - AI Context (Gemini Only)
// Issue #200: WebLLM 제거, Gemini 단일 엔진 전환
//
// 기존 이중 엔진 (Gemini + WebLLM) 구조에서
// Gemini API 단일 엔진으로 단순화

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { checkAIStatus } from '@/utils/api';

const AIContext = createContext(null);

/**
 * AI Provider - Gemini API 상태 관리
 * @agent ai-agent
 */
export function AIProvider({ children }) {
  // Gemini AI 상태
  const [aiStatus, setAiStatus] = useState({
    online: false,
    model: '',
    latency: null,
    error: null,
  });

  // Gemini 상태 확인 (1분 간격)
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkAIStatus();
        setAiStatus(status);
      } catch (error) {
        setAiStatus({
          online: false,
          model: '',
          latency: null,
          error: error.message,
        });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // 수동 상태 갱신
  const refreshStatus = useCallback(async () => {
    const status = await checkAIStatus();
    setAiStatus(status);
  }, []);

  const value = {
    // Gemini 상태
    aiStatus,
    // 상태 갱신
    refreshStatus,

    // 레거시 호환 (deprecated - 추후 제거 예정)
    // ContentInputPanel 등에서 아직 참조할 수 있음
    engine: 'gemini',
    webllmStatus: { loaded: false, loading: false, model: null, progress: 0, error: null },
    fallbackEnabled: false,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

/**
 * AI Context Hook
 * @returns {{ aiStatus: object, refreshStatus: function, engine: string }}
 */
export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI는 AIProvider 내부에서 사용해야 합니다.');
  }
  return context;
}

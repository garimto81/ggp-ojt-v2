// OJT Master - AI Context (Chrome Gemini Nano 전용, Issue #96)
// Chrome 138+ 내장 Gemini Nano 모델만 사용
/**
 * ROLE: Context API - Client State Management
 *
 * PURPOSE:
 * - Chrome Prompt API (Gemini Nano) 상태 관리
 * - 모델 로딩, 에러 상태 추적
 * - 단일 엔진으로 단순화
 *
 * RESPONSIBILITY:
 * ✅ Chrome AI 엔진 상태 (ready, loading, error)
 * ✅ 세션 생성/종료 관리
 *
 * NOT RESPONSIBLE FOR:
 * ❌ AI 콘텐츠 생성 로직 → contentGenerator 서비스 사용
 * ❌ 생성된 문서 저장 → useDocs mutation 사용
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CHROME_AI_CONFIG } from '@/constants';
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
  // Chrome AI 상태
  const [aiStatus, setAiStatus] = useState({
    supported: null, // null = 확인 중, true/false
    status: CHROME_AI_STATUS.NOT_SUPPORTED,
    ready: false,
    loading: false,
    error: null,
    errorType: null,
  });

  // 초기화: Chrome AI 지원 여부 확인
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = await checkChromeAISupport();
        const info = await getChromeAIInfo();

        setAiStatus((prev) => ({
          ...prev,
          supported,
          status: info.status,
          ready: info.status === CHROME_AI_STATUS.READY,
        }));

        console.log('[AIContext] Chrome AI:', supported ? '지원' : '미지원', info);
      } catch (error) {
        console.warn('[AIContext] Chrome AI 확인 실패:', error);
        setAiStatus((prev) => ({
          ...prev,
          supported: false,
          status: CHROME_AI_STATUS.NOT_SUPPORTED,
          error: 'Chrome AI 확인 실패',
        }));
      }
    };

    checkSupport();
  }, []);

  /**
   * Chrome AI 세션 초기화/로드
   */
  const loadAI = useCallback(async () => {
    if (aiStatus.loading) return;
    if (aiStatus.ready) return; // 이미 준비됨

    if (!aiStatus.supported) {
      const error = new Error(
        `Chrome AI (Gemini Nano)를 지원하지 않습니다. Chrome ${CHROME_AI_CONFIG.MIN_CHROME_VERSION}+ 필요.`
      );
      error.errorType = CHROME_AI_ERROR_TYPES.NOT_SUPPORTED;
      throw error;
    }

    setAiStatus((prev) => ({
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
          console.log(`[AIContext] Chrome AI 다운로드: ${progress}%`);
        },
      });

      setAiStatus((prev) => ({
        ...prev,
        ready: true,
        loading: false,
        status: CHROME_AI_STATUS.READY,
        error: null,
        errorType: null,
      }));

      console.log('[AIContext] Chrome AI 준비 완료');
    } catch (error) {
      setAiStatus((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
        errorType: error.errorType || CHROME_AI_ERROR_TYPES.SESSION_FAILED,
      }));
      throw error;
    }
  }, [aiStatus.supported, aiStatus.loading, aiStatus.ready]);

  /**
   * Chrome AI 세션 종료
   */
  const unloadAI = useCallback(async () => {
    await destroyChromeAISession();
    setAiStatus((prev) => ({
      ...prev,
      ready: false,
    }));
  }, []);

  /**
   * 상태 새로고침
   */
  const refreshStatus = useCallback(async () => {
    const status = await getChromeAIStatus();
    setAiStatus((prev) => ({
      ...prev,
      status,
      ready: status === CHROME_AI_STATUS.READY,
    }));
  }, []);

  const value = {
    // 상태
    aiStatus,
    isSupported: aiStatus.supported,
    isReady: aiStatus.ready,
    isLoading: aiStatus.loading,
    error: aiStatus.error,

    // 액션
    loadAI,
    unloadAI,
    refreshStatus,

    // 상수
    CHROME_AI_STATUS,
    CHROME_AI_ERROR_TYPES,
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

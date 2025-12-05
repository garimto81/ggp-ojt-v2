// OJT Master - AI Engine Context (PRD-0007)
// Manages AI engine state (Gemini vs WebLLM)

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WEBLLM_CONFIG } from '../constants';
import {
  initWebLLM,
  unloadWebLLM,
  isWebLLMReady,
  getCurrentModel,
  getPreferredEngine,
  setPreferredEngine,
  checkWebGPUSupport,
  generateWithWebLLM,
} from '../utils/webllm';
import { generateOJTContent as generateWithGemini } from '../utils/api';

const AIContext = createContext(null);

// Engine status enum
export const AI_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

export function AIProvider({ children }) {
  // Current engine: 'gemini' | 'webllm'
  const [engine, setEngine] = useState(() => getPreferredEngine());

  // WebLLM specific state
  const [webllmStatus, setWebllmStatus] = useState(AI_STATUS.IDLE);
  const [webllmProgress, setWebllmProgress] = useState({ text: '', progress: 0 });
  const [webllmError, setWebllmError] = useState(null);
  const [webgpuSupported, setWebgpuSupported] = useState(null);

  // Selected model for WebLLM
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem(WEBLLM_CONFIG.STORAGE_KEYS.SELECTED_MODEL) || WEBLLM_CONFIG.DEFAULT_MODEL
  );

  // Check WebGPU support on mount
  useEffect(() => {
    checkWebGPUSupport().then((result) => {
      setWebgpuSupported(result.supported);
      if (!result.supported) {
        setWebllmError(result.error);
      }
    });
  }, []);

  // Switch AI engine
  const switchEngine = useCallback(
    async (newEngine) => {
      if (newEngine === engine) return;

      if (newEngine === 'webllm') {
        // Check WebGPU support
        if (!webgpuSupported) {
          throw new Error('이 브라우저는 WebGPU를 지원하지 않습니다.');
        }

        // Initialize WebLLM if not ready
        if (!isWebLLMReady()) {
          setWebllmStatus(AI_STATUS.LOADING);
          setWebllmError(null);

          try {
            await initWebLLM(selectedModel, (progress) => {
              setWebllmProgress(progress);
            });
            setWebllmStatus(AI_STATUS.READY);
          } catch (error) {
            setWebllmStatus(AI_STATUS.ERROR);
            setWebllmError(error.message);
            throw error;
          }
        }
      } else if (newEngine === 'gemini') {
        // Optionally unload WebLLM to free memory
        // await unloadWebLLM();
        // setWebllmStatus(AI_STATUS.IDLE);
      }

      setEngine(newEngine);
      setPreferredEngine(newEngine);
    },
    [engine, selectedModel, webgpuSupported]
  );

  // Load WebLLM model
  const loadWebLLM = useCallback(
    async (modelKey = selectedModel) => {
      if (!webgpuSupported) {
        throw new Error('WebGPU를 지원하지 않습니다.');
      }

      setWebllmStatus(AI_STATUS.LOADING);
      setWebllmError(null);
      setWebllmProgress({ text: '모델 로딩 준비 중...', progress: 0 });

      try {
        await initWebLLM(modelKey, (progress) => {
          setWebllmProgress(progress);
        });
        setSelectedModel(modelKey);
        setWebllmStatus(AI_STATUS.READY);
      } catch (error) {
        setWebllmStatus(AI_STATUS.ERROR);
        setWebllmError(error.message);
        throw error;
      }
    },
    [selectedModel, webgpuSupported]
  );

  // Unload WebLLM to free memory
  const unloadModel = useCallback(async () => {
    await unloadWebLLM();
    setWebllmStatus(AI_STATUS.IDLE);
    setWebllmProgress({ text: '', progress: 0 });
  }, []);

  // Generate OJT content with current engine
  const generateContent = useCallback(
    async (contentText, title, options = {}) => {
      const targetEngine = options.engine || engine;
      const onProgress = options.onProgress;

      if (targetEngine === 'webllm') {
        if (!isWebLLMReady()) {
          throw new Error('WebLLM이 초기화되지 않았습니다.');
        }
        return generateWithWebLLM(contentText, title, onProgress);
      }

      // Default to Gemini
      return generateWithGemini(contentText, title, 1, 1, onProgress);
    },
    [engine]
  );

  // Generate with automatic fallback
  const generateWithFallback = useCallback(
    async (contentText, title, options = {}) => {
      const onProgress = options.onProgress;

      try {
        return await generateContent(contentText, title, { engine, onProgress });
      } catch (error) {
        // If WebLLM failed, fallback to Gemini
        if (engine === 'webllm') {
          console.warn('WebLLM 실패, Gemini로 폴백:', error);
          if (onProgress) onProgress('로컬 AI 실패, 클라우드 AI로 전환 중...');
          return generateWithGemini(contentText, title, 1, 1, onProgress);
        }
        throw error;
      }
    },
    [engine, generateContent]
  );

  const value = {
    // Engine state
    engine,
    switchEngine,

    // WebLLM state
    webllmStatus,
    webllmProgress,
    webllmError,
    webgpuSupported,
    selectedModel,
    currentModel: getCurrentModel(),

    // WebLLM actions
    loadWebLLM,
    unloadModel,
    isWebLLMReady: isWebLLMReady(),

    // Content generation
    generateContent,
    generateWithFallback,

    // Available models
    availableModels: WEBLLM_CONFIG.MODELS,
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

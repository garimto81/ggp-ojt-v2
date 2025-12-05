// OJT Master - AI Engine Selector Component (PRD-0007)
// UI for switching between Gemini and WebLLM engines

import { useState } from 'react';
import { useAI, AI_STATUS } from '../contexts/AIContext';

export default function AIEngineSelector({ compact = false }) {
  const {
    engine,
    switchEngine,
    webllmStatus,
    webllmProgress,
    webllmError,
    webgpuSupported,
    selectedModel,
    loadWebLLM,
    unloadModel,
    isWebLLMReady,
    availableModels,
  } = useAI();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle engine switch
  const handleEngineSwitch = async (newEngine) => {
    if (newEngine === engine) return;
    if (isLoading) return;

    setIsLoading(true);
    try {
      await switchEngine(newEngine);
    } catch (error) {
      console.error('Engine switch failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle model load
  const handleModelLoad = async (modelKey) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await loadWebLLM(modelKey);
    } catch (error) {
      console.error('Model load failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle model unload
  const handleUnload = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await unloadModel();
    } catch (error) {
      console.error('Model unload failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Compact mode - just show current engine badge
  if (compact) {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
        title="AI 엔진 설정"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            engine === 'webllm' && isWebLLMReady
              ? 'bg-green-500'
              : engine === 'gemini'
                ? 'bg-blue-500'
                : 'bg-gray-400'
          }`}
        />
        <span className="font-medium">{engine === 'gemini' ? 'Gemini' : 'WebLLM'}</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span className="font-medium text-slate-700">AI 엔진</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-xs rounded-full font-medium ${
              engine === 'gemini' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}
          >
            {engine === 'gemini' ? 'Gemini (클라우드)' : 'WebLLM (로컬)'}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-200 p-4 space-y-4">
          {/* Engine selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">엔진 선택</label>
            <div className="grid grid-cols-2 gap-2">
              {/* Gemini option */}
              <button
                onClick={() => handleEngineSwitch('gemini')}
                disabled={isLoading}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  engine === 'gemini'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">☁️</span>
                  <span className="font-medium">Gemini</span>
                </div>
                <p className="text-xs text-slate-500">Google 클라우드 AI, 인터넷 필요</p>
              </button>

              {/* WebLLM option */}
              <button
                onClick={() => handleEngineSwitch('webllm')}
                disabled={isLoading || !webgpuSupported}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  engine === 'webllm'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300'
                } ${isLoading || !webgpuSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">💻</span>
                  <span className="font-medium">WebLLM</span>
                </div>
                <p className="text-xs text-slate-500">
                  {webgpuSupported === false ? 'WebGPU 미지원 브라우저' : '브라우저 로컬 AI, 오프라인 가능'}
                </p>
              </button>
            </div>
          </div>

          {/* WebGPU status warning */}
          {webgpuSupported === false && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>WebGPU 미지원:</strong> {webllmError || 'Chrome 113+ 또는 Edge 113+를 사용해주세요.'}
              </p>
            </div>
          )}

          {/* WebLLM specific controls */}
          {engine === 'webllm' && webgpuSupported && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {/* Model selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">모델 선택</label>
                <div className="space-y-2">
                  {Object.entries(availableModels).map(([key, model]) => (
                    <button
                      key={key}
                      onClick={() => handleModelLoad(key)}
                      disabled={isLoading || webllmStatus === AI_STATUS.LOADING}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        selectedModel === key
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-slate-500">{model.size}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{model.description}</span>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-xs ${i < model.koreanQuality ? 'text-yellow-500' : 'text-slate-300'}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Loading progress */}
              {webllmStatus === AI_STATUS.LOADING && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">모델 로딩 중...</span>
                    <span className="text-slate-500">{Math.round(webllmProgress.progress * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${webllmProgress.progress * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">{webllmProgress.text}</p>
                </div>
              )}

              {/* Ready status */}
              {webllmStatus === AI_STATUS.READY && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-green-700">모델 준비 완료</span>
                  </div>
                  <button
                    onClick={handleUnload}
                    disabled={isLoading}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    메모리 해제
                  </button>
                </div>
              )}

              {/* Error status */}
              {webllmStatus === AI_STATUS.ERROR && webllmError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>오류:</strong> {webllmError}
                  </p>
                  <button
                    onClick={() => handleModelLoad(selectedModel)}
                    className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                  >
                    다시 시도
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Info section */}
          <div className="pt-3 border-t border-slate-100">
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer hover:text-slate-700">엔진 비교 정보</summary>
              <div className="mt-2 space-y-1 pl-4">
                <p>
                  <strong>Gemini:</strong> 빠른 응답, 높은 품질, 인터넷 연결 필요
                </p>
                <p>
                  <strong>WebLLM:</strong> 오프라인 사용, 개인정보 보호, 초기 로딩 시간 필요 (첫 실행 시 ~2GB
                  다운로드)
                </p>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

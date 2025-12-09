// OJT Master - AI Engine Selector (Issue #30, #45)
// Gemini / WebLLM 엔진 선택 UI

import { useState } from 'react';
import { useAI } from '../contexts/AIContext';

/**
 * AI 엔진 선택 컴포넌트
 * MentorDashboard에서 사용
 */
export default function AIEngineSelector() {
  const {
    engine,
    switchEngine,
    webllmStatus,
    webgpuSupported,
    loadWebLLM,
    unloadModel,
    selectedModel,
    setSelectedModel,
    availableModels,
  } = useAI();

  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState(null);

  // 엔진 전환 핸들러
  const handleEngineSwitch = async (newEngine) => {
    setError(null);
    try {
      await switchEngine(newEngine);

      // WebLLM 선택 시 모델 로딩 안내
      if (newEngine === 'webllm' && !webllmStatus.loaded) {
        setIsExpanded(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // 모델 로딩 핸들러
  const handleLoadModel = async () => {
    setError(null);
    try {
      await loadWebLLM(selectedModel);
    } catch (err) {
      setError(err.message);
    }
  };

  // 모델 언로드 핸들러
  const handleUnloadModel = async () => {
    await unloadModel();
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-medium text-slate-700">AI 엔진</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-slate-600 text-sm"
        >
          {isExpanded ? '접기' : '설정'}
        </button>
      </div>

      {/* 엔진 선택 버튼 */}
      <div className="flex gap-2 mb-3">
        {/* Gemini 버튼 */}
        <button
          onClick={() => handleEngineSwitch('gemini')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            engine === 'gemini'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span className="mr-1">☁️</span>
          Gemini (Cloud)
        </button>

        {/* WebLLM 버튼 */}
        <button
          onClick={() => handleEngineSwitch('webllm')}
          disabled={webgpuSupported === false}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            engine === 'webllm'
              ? 'bg-green-500 text-white'
              : webgpuSupported === false
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          title={webgpuSupported === false ? 'WebGPU 미지원 브라우저' : ''}
        >
          <span className="mr-1">💻</span>
          WebLLM (Local)
          {webgpuSupported === false && <span className="ml-1 text-xs">(미지원)</span>}
        </button>
      </div>

      {/* 현재 상태 표시 */}
      <div className="text-xs text-slate-500 mb-2">
        {engine === 'gemini' ? (
          <span>Google Gemini API 사용 중 (클라우드)</span>
        ) : webllmStatus.loaded ? (
          <span className="text-green-600">
            ✓ {availableModels.find((m) => m.id === webllmStatus.model)?.name || webllmStatus.model}{' '}
            로드됨
          </span>
        ) : webllmStatus.loading ? (
          <span className="text-amber-600">모델 로딩 중... {webllmStatus.progress}%</span>
        ) : (
          <span className="text-slate-400">모델을 로드해주세요</span>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && <div className="text-xs text-red-500 bg-red-50 p-2 rounded mb-2">{error}</div>}

      {/* 확장 영역: WebLLM 설정 */}
      {isExpanded && engine === 'webllm' && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-sm font-medium text-slate-600 mb-2">모델 선택</div>

          {/* 모델 목록 */}
          <div className="space-y-2 mb-3">
            {availableModels.map((model) => (
              <label
                key={model.id}
                className={`flex items-center p-2 rounded-lg cursor-pointer transition-all ${
                  selectedModel === model.id
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <input
                  type="radio"
                  name="webllm-model"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={webllmStatus.loading}
                  className="mr-2"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700">
                    {model.name}
                    {model.recommended && (
                      <span className="ml-1 text-xs text-green-600 bg-green-100 px-1 rounded">
                        추천
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {model.size} • {model.description}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* 로드/언로드 버튼 */}
          <div className="flex gap-2">
            {!webllmStatus.loaded ? (
              <button
                onClick={handleLoadModel}
                disabled={webllmStatus.loading}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  webllmStatus.loading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {webllmStatus.loading ? (
                  <>
                    <span className="animate-spin inline-block mr-1">⏳</span>
                    로딩 중 ({webllmStatus.progress}%)
                  </>
                ) : (
                  '모델 로드'
                )}
              </button>
            ) : (
              <button
                onClick={handleUnloadModel}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-slate-200 text-slate-600 hover:bg-slate-300"
              >
                모델 언로드
              </button>
            )}
          </div>

          {/* 로딩 프로그레스 바 */}
          {webllmStatus.loading && (
            <div className="mt-3">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${webllmStatus.progress}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1 text-center">
                모델 다운로드 중... 첫 로딩 시 수 분이 소요될 수 있습니다.
              </div>
            </div>
          )}

          {/* WebLLM 안내 */}
          <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-500">
            <strong>WebLLM 안내:</strong>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>브라우저에서 AI 모델을 직접 실행합니다</li>
              <li>API 비용 없음 (무료)</li>
              <li>데이터가 외부로 전송되지 않음</li>
              <li>첫 로딩 시 모델 다운로드 필요 (2-3GB)</li>
              <li>WebGPU 지원 브라우저 필요 (Chrome/Edge 113+)</li>
            </ul>
          </div>
        </div>
      )}

      {/* WebGPU 미지원 안내 */}
      {isExpanded && webgpuSupported === false && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <strong>WebGPU 미지원:</strong> 이 브라우저는 WebGPU를 지원하지 않습니다.
          <br />
          Chrome 113+ 또는 Edge 113+ 버전을 사용해주세요.
        </div>
      )}
    </div>
  );
}

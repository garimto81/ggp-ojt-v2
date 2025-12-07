// OJT Master - WebLLM Model Selector
// 브라우저 내 AI 모델 선택 UI

import { useState } from 'react';
import { useAI } from '../hooks/AIContext';
import { InlineSpinner } from '@components/ui/Spinner';

/**
 * WebLLM 모델 선택 컴포넌트
 * MentorDashboard에서 사용
 */
export default function AIEngineSelector() {
  const {
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

  // WebGPU 미지원 시
  if (webgpuSupported === false) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⚠️</span>
          <span className="font-medium text-amber-700">WebGPU 미지원</span>
        </div>
        <p className="text-sm text-amber-600">
          이 브라우저는 WebGPU를 지원하지 않습니다.
          <br />
          Chrome 113+ 또는 Edge 113+ 버전을 사용해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-medium text-slate-700">AI 모델 (WebLLM)</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-slate-600 text-sm"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'AI 모델 설정 패널 접기' : 'AI 모델 설정 패널 열기'}
        >
          {isExpanded ? '접기' : '설정'}
        </button>
      </div>

      {/* 현재 상태 표시 */}
      <div className="text-sm mb-2" role="status" aria-live="polite">
        {webllmStatus.loaded ? (
          <span className="text-green-600 font-medium">
            ✓ {availableModels.find((m) => m.id === webllmStatus.model)?.name || webllmStatus.model}{' '}
            사용 준비 완료
          </span>
        ) : webllmStatus.loading ? (
          <div>
            <span className="text-amber-600">모델 로딩 중... {webllmStatus.progress}%</span>
            <div
              className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={webllmStatus.progress}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="모델 로딩 진행률"
            >
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${webllmStatus.progress}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-1">
              첫 로딩 시 모델 다운로드로 수 분이 소요될 수 있습니다.
            </div>
          </div>
        ) : (
          <div>
            <span className="text-slate-500">AI 모델을 로드해주세요</span>
            <button
              onClick={handleLoadModel}
              className="ml-2 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
              aria-label="AI 모델 로드 시작"
            >
              모델 로드
            </button>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="text-xs text-red-500 bg-red-50 p-2 rounded mb-2" role="alert">
          {error}
        </div>
      )}

      {/* 확장 영역: 모델 선택 */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-sm font-medium text-slate-600 mb-2">모델 선택</div>

          {/* 모델 목록 */}
          <div className="space-y-2 mb-3" role="radiogroup" aria-label="WebLLM 모델 선택">
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
                  aria-label={`${model.name}, ${model.size}, ${model.description}`}
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
                    {model.size} - {model.description}
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
                  <span className="flex items-center justify-center gap-2">
                    <InlineSpinner />
                    로딩 중 ({webllmStatus.progress}%)
                  </span>
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

          {/* WebLLM 안내 */}
          <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-500">
            <strong>WebLLM 안내:</strong>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>브라우저에서 AI 모델을 직접 실행합니다</li>
              <li>API 비용 없음 (완전 무료)</li>
              <li>데이터가 외부로 전송되지 않습니다</li>
              <li>첫 로딩 시 모델 다운로드 필요 (2-3GB)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

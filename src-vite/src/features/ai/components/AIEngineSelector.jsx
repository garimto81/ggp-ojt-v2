// OJT Master - AI Engine Selector (Local AI + WebLLM)
// AI 엔진 상태 표시 및 관리 UI

import { useState } from 'react';
import { useAI, AI_STATUS } from '../hooks/AIContext';
import { InlineSpinner } from '@components/ui/Spinner';

/**
 * AI 엔진 상태 표시 및 로드 컴포넌트
 * MentorDashboard에서 사용
 */
export default function AIEngineSelector() {
  const { aiStatus, loadWebLLM, refreshStatus } = useAI();
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // WebLLM 로드 핸들러
  const handleLoadWebLLM = async () => {
    setError(null);
    try {
      await loadWebLLM((progress) => {
        setLoadingProgress(progress);
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // 상태 새로고침
  const handleRefresh = async () => {
    setError(null);
    await refreshStatus();
  };

  // Local AI 사용 중
  if (aiStatus.status === AI_STATUS.LOCAL_AI_READY) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🖥️</span>
            <span className="font-medium text-green-700">Local AI 서버 연결됨</span>
          </div>
          <button
            onClick={handleRefresh}
            className="text-xs text-green-600 hover:text-green-800 underline"
          >
            새로고침
          </button>
        </div>
        <div className="text-sm text-green-600">
          <p>
            <strong>모델:</strong> {aiStatus.localAI.model || 'Qwen/Qwen3-4B'}
          </p>
          <p className="text-xs text-green-500 mt-1">{aiStatus.localAI.url}</p>
        </div>
        <div className="mt-3 p-2 bg-green-100/50 rounded-lg text-xs text-green-600">
          <strong>Local AI 장점:</strong>
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            <li>사내 서버에서 직접 처리 (빠른 응답)</li>
            <li>외부 네트워크 불필요</li>
            <li>대규모 모델 사용 가능</li>
          </ul>
        </div>
      </div>
    );
  }

  // 확인 중
  if (aiStatus.status === AI_STATUS.CHECKING) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <InlineSpinner />
          <span className="text-slate-600">AI 엔진 확인 중...</span>
        </div>
      </div>
    );
  }

  // WebLLM 로딩 중
  if (aiStatus.status === AI_STATUS.WEBLLM_LOADING) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <InlineSpinner />
          <span className="font-medium text-amber-700">WebLLM 모델 로딩 중...</span>
        </div>
        <div className="w-full bg-amber-200 rounded-full h-2 mb-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <p className="text-xs text-amber-600">첫 실행 시 모델 다운로드가 필요합니다 (~2.4GB)</p>
      </div>
    );
  }

  // WebLLM 준비됨
  if (aiStatus.status === AI_STATUS.WEBLLM_READY) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌐</span>
            <span className="font-medium text-blue-700">WebLLM 준비됨</span>
          </div>
          <button
            onClick={handleRefresh}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            새로고침
          </button>
        </div>
        <div className="text-sm text-blue-600">
          <p>
            <strong>모델:</strong> {aiStatus.webllm.model || 'Qwen2.5-3B-Instruct'}
          </p>
        </div>
        <div className="mt-3 p-2 bg-blue-100/50 rounded-lg text-xs text-blue-600">
          <strong>WebLLM 특징:</strong>
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            <li>브라우저 내에서 직접 실행</li>
            <li>외부 서버 불필요 (오프라인 가능)</li>
            <li>WebGPU 활용</li>
          </ul>
        </div>
      </div>
    );
  }

  // AI 미사용 상태 (로딩 필요)
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-medium text-slate-700">AI 엔진</span>
        </div>
        <button
          onClick={handleRefresh}
          className="text-xs text-slate-500 hover:text-slate-700 underline"
        >
          새로고침
        </button>
      </div>

      {/* 상태 표시 */}
      <div className="text-sm mb-3">
        <p className="text-slate-500 mb-2">AI를 시작해주세요</p>
        <button
          onClick={handleLoadWebLLM}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
          aria-label="WebLLM 시작"
        >
          WebLLM 시작
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="text-xs text-red-500 bg-red-50 p-2 rounded mb-2" role="alert">
          {error}
        </div>
      )}

      {/* 안내 */}
      <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-500">
        <strong>AI 엔진 우선순위:</strong>
        <ol className="mt-1 list-decimal list-inside space-y-0.5">
          <li>
            <strong>Local AI</strong> - 사내 vLLM 서버 (VITE_LOCAL_AI_URL 설정 필요)
          </li>
          <li>
            <strong>WebLLM</strong> - 브라우저 내 LLM (WebGPU 필요)
          </li>
        </ol>
      </div>
    </div>
  );
}

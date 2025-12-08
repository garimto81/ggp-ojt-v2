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

  // 초기 확인 중
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

  // Local AI 연결 확인 중
  if (aiStatus.status === AI_STATUS.LOCAL_AI_CHECKING) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <InlineSpinner />
          <span className="font-medium text-blue-700">Local AI 서버 연결 확인 중...</span>
        </div>
        <p className="text-xs text-blue-600">사내 vLLM 서버에 연결을 시도하고 있습니다.</p>
      </div>
    );
  }

  // Local AI 연결 실패 (WebLLM fallback 필요)
  if (aiStatus.status === AI_STATUS.LOCAL_AI_FAILED) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="font-medium text-amber-700">Local AI 연결 실패</span>
          </div>
          <button
            onClick={handleRefresh}
            className="text-xs text-amber-600 hover:text-amber-800 underline"
          >
            다시 시도
          </button>
        </div>

        {/* 안내 메시지 */}
        <div className="text-sm text-amber-600 mb-3">
          <p>Local AI 서버에 연결할 수 없습니다.</p>
          <p className="text-xs mt-1">WebLLM을 사용하여 브라우저에서 AI를 실행할 수 있습니다.</p>
        </div>

        {/* WebLLM 시작 버튼 */}
        <button
          onClick={handleLoadWebLLM}
          className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition"
          aria-label="WebLLM으로 대체 시작"
        >
          WebLLM으로 대체
        </button>

        {/* 에러 메시지 */}
        {error && (
          <div className="text-xs text-red-500 bg-red-50 p-2 rounded mt-2" role="alert">
            {error}
          </div>
        )}

        {/* 안내 */}
        <div className="mt-3 p-2 bg-amber-100/50 rounded-lg text-xs text-amber-600">
          <strong>WebLLM 안내:</strong>
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            <li>브라우저에서 직접 AI 실행 (WebGPU 필요)</li>
            <li>첫 실행 시 모델 다운로드 필요 (~2.4GB)</li>
            <li>Local AI 서버가 복구되면 자동 전환됩니다</li>
          </ul>
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

  // AI 미사용 상태 (NO_ENGINE - 모든 엔진 사용 불가)
  return (
    <div className="bg-red-50 rounded-lg border border-red-200 p-4 mb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">❌</span>
          <span className="font-medium text-red-700">AI 엔진 사용 불가</span>
        </div>
        <button
          onClick={handleRefresh}
          className="text-xs text-red-600 hover:text-red-800 underline"
        >
          다시 확인
        </button>
      </div>

      {/* 상태 표시 */}
      <div className="text-sm mb-3">
        <p className="text-red-600 mb-2">
          {aiStatus.error || 'Local AI 서버와 WebLLM 모두 사용할 수 없습니다.'}
        </p>
        <button
          onClick={handleLoadWebLLM}
          className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
          aria-label="WebLLM 다시 시도"
        >
          WebLLM 다시 시도
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="text-xs text-red-500 bg-red-100 p-2 rounded mb-2" role="alert">
          {error}
        </div>
      )}

      {/* 안내 */}
      <div className="mt-3 p-2 bg-red-100/50 rounded-lg text-xs text-red-600">
        <strong>문제 해결 방법:</strong>
        <ol className="mt-1 list-decimal list-inside space-y-0.5">
          <li>
            <strong>Local AI</strong> - vLLM 서버가 실행 중인지 확인하세요
          </li>
          <li>
            <strong>WebLLM</strong> - WebGPU 지원 브라우저가 필요합니다 (Chrome 113+)
          </li>
          <li>네트워크 연결 상태를 확인하세요</li>
        </ol>
      </div>
    </div>
  );
}

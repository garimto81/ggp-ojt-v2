// OJT Master - Chrome AI Selector (Chrome Gemini Nano 전용)
// Chrome 138+ 내장 Gemini Nano 모델 UI

import { useState } from 'react';
import { useAI } from '../hooks/AIContext';
import { InlineSpinner } from '@components/ui/Spinner';

/**
 * Chrome AI 상태 표시 및 로드 컴포넌트
 * MentorDashboard에서 사용
 */
export default function AIEngineSelector() {
  const { aiStatus, isSupported, isReady, isLoading, loadAI, unloadAI, CHROME_AI_STATUS } = useAI();

  const [error, setError] = useState(null);

  // AI 로드 핸들러
  const handleLoadAI = async () => {
    setError(null);
    try {
      await loadAI();
    } catch (err) {
      setError(err.message);
    }
  };

  // AI 언로드 핸들러
  const handleUnloadAI = async () => {
    await unloadAI();
  };

  // Chrome AI 미지원 시
  if (isSupported === false) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⚠️</span>
          <span className="font-medium text-amber-700">Chrome AI 미지원</span>
        </div>
        <p className="text-sm text-amber-600">
          이 브라우저는 Chrome AI (Gemini Nano)를 지원하지 않습니다.
          <br />
          <strong>Chrome 138+</strong> 버전으로 업그레이드해주세요.
        </p>
        <a
          href="https://www.google.com/chrome/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-sm text-blue-600 hover:underline"
        >
          Chrome 다운로드 →
        </a>
      </div>
    );
  }

  // 확인 중
  if (isSupported === null) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <InlineSpinner />
          <span className="text-slate-600">Chrome AI 확인 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-medium text-slate-700">Chrome AI (Gemini Nano)</span>
        </div>
      </div>

      {/* 현재 상태 표시 */}
      <div className="text-sm mb-2" role="status" aria-live="polite">
        {isReady ? (
          <div className="flex items-center justify-between">
            <span className="text-green-600 font-medium">✓ AI 사용 준비 완료</span>
            <button
              onClick={handleUnloadAI}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              세션 종료
            </button>
          </div>
        ) : isLoading ? (
          <div>
            <span className="text-amber-600 flex items-center gap-2">
              <InlineSpinner />
              AI 준비 중...
            </span>
            {aiStatus.status === CHROME_AI_STATUS.DOWNLOADING && (
              <div className="text-xs text-slate-500 mt-1">
                모델 다운로드 중 (첫 실행 시에만 필요)
              </div>
            )}
          </div>
        ) : aiStatus.status === CHROME_AI_STATUS.NOT_DOWNLOADED ? (
          <div>
            <span className="text-slate-500">모델 다운로드 필요</span>
            <button
              onClick={handleLoadAI}
              className="ml-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              aria-label="Chrome AI 모델 다운로드"
            >
              다운로드 시작
            </button>
          </div>
        ) : (
          <div>
            <span className="text-slate-500">AI를 시작해주세요</span>
            <button
              onClick={handleLoadAI}
              className="ml-2 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
              aria-label="Chrome AI 시작"
            >
              AI 시작
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

      {/* Chrome AI 안내 */}
      <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-500">
        <strong>Chrome AI (Gemini Nano):</strong>
        <ul className="mt-1 list-disc list-inside space-y-0.5">
          <li>Chrome 브라우저에 내장된 AI 모델</li>
          <li>완전 무료 (API 비용 없음)</li>
          <li>데이터가 외부로 전송되지 않음 (개인정보 보호)</li>
          <li>Chrome 138+ 버전 필요</li>
        </ul>
      </div>
    </div>
  );
}

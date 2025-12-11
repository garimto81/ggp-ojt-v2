/**
 * UrlViewer - URL 원본 콘텐츠 뷰어
 * @agent learning-study-agent
 * @blocks learning.study.url
 * @issue #200 - Context API 기반 퀴즈 생성
 *
 * URL 원본 콘텐츠를 iframe 또는 새 탭에서 표시합니다.
 * source_type='url'인 문서에서 사용됩니다.
 */

import { useState } from 'react';

/**
 * URL 뷰어 컴포넌트
 * @param {Object} props
 * @param {string} props.url - 표시할 URL
 * @param {string} props.title - 문서 제목
 * @param {string} props.className - 추가 CSS 클래스
 */
export default function UrlViewer({ url, title, className = '' }) {
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // iframe 로드 완료 핸들러
  const handleLoad = () => {
    setIsLoading(false);
  };

  // iframe 로드 에러 핸들러
  const handleError = () => {
    setLoadError(true);
    setIsLoading(false);
  };

  // 새 탭에서 열기
  const openInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 에러 발생 시 새 탭 안내
  if (loadError) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg ${className}`}>
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">페이지를 미리볼 수 없습니다</h3>
        <p className="text-sm text-gray-500 mb-4 text-center">
          이 웹사이트는 iframe 내장을 허용하지 않습니다.
          <br />
          새 탭에서 원본 콘텐츠를 확인해주세요.
        </p>
        <button
          onClick={openInNewTab}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          새 탭에서 열기
        </button>
      </div>
    );
  }

  return (
    <div className={`relative bg-white rounded-lg overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-gray-800 truncate">{title || 'URL 문서'}</h3>
            <p className="text-xs text-gray-500 truncate">{url}</p>
          </div>
        </div>
        <button
          onClick={openInNewTab}
          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1 flex-shrink-0"
          title="새 탭에서 열기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          <span className="hidden sm:inline">새 탭</span>
        </button>
      </div>

      {/* 로딩 표시 */}
      {isLoading && (
        <div className="absolute inset-0 top-14 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">콘텐츠 로딩 중...</span>
          </div>
        </div>
      )}

      {/* iframe */}
      <iframe
        src={url}
        title={title || 'URL 문서'}
        className="w-full h-[calc(100%-56px)] min-h-[500px] border-0"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        loading="lazy"
      />
    </div>
  );
}

/**
 * URL이 iframe에서 로드 가능한지 확인하는 유틸리티
 * (대부분의 사이트는 X-Frame-Options로 차단함)
 * @param {string} url - 확인할 URL
 * @returns {Promise<boolean>}
 */
export async function checkIframeSupport(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    // X-Frame-Options 헤더 확인은 CORS로 인해 제한됨
    // 실제로는 iframe 로드 시 에러로 확인
    return response.ok || response.type === 'opaque';
  } catch {
    return false;
  }
}

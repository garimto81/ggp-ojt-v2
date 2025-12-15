// OJT Master v2.7.0 - URL Preview Panel Component (FR-804)
// URL 메타데이터 미리보기 및 콘텐츠 표시
// @agent content-create-agent

import { useState, useEffect } from 'react';

import { fetchWithCorsProxy, extractMetadata, extractTextContent } from '@/utils/cors-proxy';

export default function UrlPreviewPanel({ url, onTextExtracted, onError }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const [showFullText, setShowFullText] = useState(false);

  useEffect(() => {
    if (!url) {
      setMetadata(null);
      setPreviewText('');
      setError(null);
      return;
    }

    const fetchPreview = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const html = await fetchWithCorsProxy(url);
        const meta = extractMetadata(html);
        const textResult = extractTextContent(html);

        setMetadata(meta);
        setPreviewText(textResult.text);

        // 부모 컴포넌트에 추출된 텍스트 전달
        onTextExtracted?.({
          ...textResult,
          metadata: meta,
        });
      } catch (err) {
        const errorMsg = err.message || 'URL 로드 실패';
        setError(errorMsg);
        onError?.(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [url, onTextExtracted, onError]);

  if (!url) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-gray-400">
        <div className="text-center">
          <svg
            className="mx-auto mb-4 h-16 w-16 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <p>URL을 입력하면 미리보기가 표시됩니다</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="text-gray-600">URL 분석 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center text-red-500">
          <svg
            className="mx-auto mb-2 h-12 w-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="font-medium">로드 실패</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded bg-red-100 px-4 py-2 text-red-700 hover:bg-red-200"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Metadata Card */}
      {metadata && (
        <div className="border-b bg-white p-4">
          <div className="flex gap-4">
            {/* Thumbnail */}
            {metadata.image && (
              <div className="flex-shrink-0">
                <img
                  src={metadata.image}
                  alt=""
                  className="h-24 w-24 rounded-lg bg-gray-100 object-cover"
                  onError={(e) => (e.target.style.display = 'none')}
                />
              </div>
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              {metadata.siteName && (
                <p className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                  {metadata.favicon && (
                    <img
                      src={metadata.favicon}
                      alt=""
                      className="h-4 w-4"
                      onError={(e) => (e.target.style.display = 'none')}
                    />
                  )}
                  {metadata.siteName}
                </p>
              )}
              <h3 className="mb-1 line-clamp-2 font-bold text-gray-900">
                {metadata.title || '제목 없음'}
              </h3>
              {metadata.description && (
                <p className="line-clamp-2 text-sm text-gray-600">{metadata.description}</p>
              )}
            </div>
          </div>

          {/* URL */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block truncate text-xs text-blue-500 hover:text-blue-700"
          >
            {url}
          </a>
        </div>
      )}

      {/* Preview Text */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">추출된 텍스트</h4>
          <span className="text-xs text-gray-500">{previewText.length.toLocaleString()}자</span>
        </div>

        <div
          className={`text-sm whitespace-pre-wrap text-gray-600 ${!showFullText ? 'line-clamp-[20]' : ''} `}
        >
          {previewText || '텍스트를 추출할 수 없습니다.'}
        </div>

        {previewText.length > 1000 && (
          <button
            onClick={() => setShowFullText(!showFullText)}
            className="mt-2 text-sm text-blue-500 hover:text-blue-700"
          >
            {showFullText ? '접기' : '전체 보기'}
          </button>
        )}
      </div>
    </div>
  );
}

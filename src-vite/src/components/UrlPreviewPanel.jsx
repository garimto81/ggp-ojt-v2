// OJT Master v2.7.0 - URL Preview Panel Component
// FR-101: URL 미리보기 패널

import { useState, useEffect, useCallback } from 'react';
import { extractUrlText } from '../utils/api';
import { estimateReadingTime } from '../utils/helpers';

/**
 * URL 미리보기 패널 컴포넌트
 * URL 입력 시 텍스트 추출하여 미리보기 표시
 *
 * @param {string} url - 미리볼 URL
 * @param {function} onExtracted - 텍스트 추출 완료 콜백 ({ text, title, wasTruncated })
 * @param {function} onError - 오류 발생 콜백
 */
export default function UrlPreviewPanel({ url, onExtracted, onError }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  // Debounce를 위한 URL 추출
  const extractFromUrl = useCallback(
    async (targetUrl) => {
      if (!targetUrl || !targetUrl.trim()) {
        setPreview(null);
        setError(null);
        return;
      }

      // URL 형식 검증
      try {
        new URL(targetUrl);
      } catch {
        setError('올바른 URL 형식이 아닙니다');
        setPreview(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await extractUrlText(targetUrl, setLoadingStatus);

        const previewData = {
          url: targetUrl,
          text: result.text,
          title: extractTitleFromText(result.text) || extractDomainFromUrl(targetUrl),
          charCount: result.extractedLength || result.text.length,
          wasTruncated: result.wasTruncated || false,
          originalLength: result.originalLength || result.text.length,
          estimatedMinutes: estimateReadingTime(result.text),
          previewText: result.text.slice(0, 500),
        };

        setPreview(previewData);
        onExtracted?.(previewData);
      } catch (err) {
        const errorMessage = err.message || 'URL 텍스트 추출에 실패했습니다';
        setError(errorMessage);
        setPreview(null);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
        setLoadingStatus('');
      }
    },
    [onExtracted, onError]
  );

  // URL 변경 시 500ms 디바운스로 추출
  useEffect(() => {
    const timer = setTimeout(() => {
      extractFromUrl(url);
    }, 500);

    return () => clearTimeout(timer);
  }, [url, extractFromUrl]);

  // 텍스트에서 제목 추출 시도
  const extractTitleFromText = (text) => {
    if (!text) return null;
    const firstLine = text.split('\n')[0]?.trim();
    if (firstLine && firstLine.length < 100) {
      return firstLine;
    }
    return null;
  };

  // URL에서 도메인 추출
  const extractDomainFromUrl = (urlString) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname;
    } catch {
      return 'URL 문서';
    }
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    extractFromUrl(url);
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm text-gray-600">{loadingStatus || 'URL 분석 중...'}</span>
        </div>
      </div>
    );
  }

  // 오류 발생
  if (error) {
    return (
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="text-sm text-blue-500 hover:text-blue-700"
            title="다시 시도"
          >
            재시도
          </button>
        </div>
      </div>
    );
  }

  // 미리보기 없음
  if (!preview) {
    return null;
  }

  // 미리보기 표시
  return (
    <div className="border rounded-lg overflow-hidden bg-white mt-4">
      {/* 헤더 */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <h4 className="font-medium text-gray-800">{preview.title}</h4>
          </div>
          <button
            onClick={handleRefresh}
            className="text-gray-400 hover:text-gray-600"
            title="새로고침"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 통계 */}
      <div className="px-4 py-2 bg-blue-50 border-b flex gap-4 text-xs">
        <span className="flex items-center gap-1 text-gray-600">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {preview.charCount.toLocaleString()}자
          {preview.wasTruncated && (
            <span className="text-amber-600 ml-1">
              (원본 {preview.originalLength.toLocaleString()}자에서 잘림)
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-gray-600">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          예상 {preview.estimatedMinutes}분
        </span>
      </div>

      {/* 미리보기 텍스트 */}
      <div className="p-4">
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
          {preview.previewText}
          {preview.text.length > 500 && (
            <span className="text-gray-400">... (더 많은 내용이 있습니다)</span>
          )}
        </p>
      </div>

      {/* 원본 URL 링크 */}
      <div className="px-4 py-2 bg-gray-50 border-t">
        <a
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:text-blue-700 truncate block"
          title={preview.url}
        >
          {preview.url}
        </a>
      </div>
    </div>
  );
}

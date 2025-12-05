// OJT Master v2.7.0 - Original Content Viewer Component
// FR-401: 원문 뷰어 (URL iframe / PDF 뷰어)

import { useState } from 'react';
import PdfViewer from './PdfViewer';

/**
 * 원문 콘텐츠 뷰어 컴포넌트
 * source_type에 따라 적절한 뷰어 표시
 *
 * @param {Object} doc - 문서 객체
 * @param {string} doc.source_type - 'url' | 'pdf' | 'manual'
 * @param {string} doc.source_url - URL 주소
 * @param {string} doc.source_file - PDF 파일 URL
 */
export default function OriginalContentViewer({ doc }) {
  const [iframeError, setIframeError] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  if (!doc) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        문서를 선택해주세요.
      </div>
    );
  }

  // URL 타입: iframe으로 표시
  if (doc.source_type === 'url' && doc.source_url) {
    if (iframeError) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-700 mb-2">
            이 페이지는 내장 표시가 불가능합니다
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            보안 정책으로 인해 일부 사이트는 iframe에서 표시되지 않습니다.
          </p>
          <a
            href={doc.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            새 탭에서 열기
          </a>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        {/* URL 헤더 */}
        <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-gray-500 truncate flex-1" title={doc.source_url}>
            {doc.source_url}
          </span>
          <a
            href={doc.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-sm text-blue-500 hover:text-blue-700 whitespace-nowrap"
          >
            새 탭 ↗
          </a>
        </div>

        {/* iframe */}
        <iframe
          src={doc.source_url}
          className="flex-1 w-full border-0"
          title="원문 보기"
          sandbox="allow-scripts allow-same-origin"
          onError={() => setIframeError(true)}
          onLoad={(e) => {
            // Check if iframe loaded successfully
            try {
              // This will throw if cross-origin
              const test = e.target.contentWindow.location.href;
              if (!test) setIframeError(true);
            } catch {
              // Cross-origin iframe loaded, which is fine
            }
          }}
        />
      </div>
    );
  }

  // PDF 타입: PdfViewer 사용
  if (doc.source_type === 'pdf' && doc.source_file) {
    return (
      <div className="h-full">
        <PdfViewer
          url={doc.source_file}
          filename={doc.title ? `${doc.title}.pdf` : 'document.pdf'}
          showControls={true}
        />
      </div>
    );
  }

  // Manual 타입 또는 원본 없음: 섹션 표시
  if (doc.sections && doc.sections.length > 0) {
    return (
      <div className="h-full overflow-auto p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">원본 콘텐츠</h3>
        <div className="space-y-6">
          {doc.sections.map((section, idx) => (
            <div key={idx} className="border-b pb-4 last:border-b-0">
              <h4 className="font-medium text-gray-700 mb-2">
                {section.title || `섹션 ${idx + 1}`}
              </h4>
              <div className="text-sm text-gray-600 whitespace-pre-wrap">{section.content}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 원본 없음
  return (
    <div className="h-full flex items-center justify-center text-gray-500">
      <div className="text-center">
        <svg
          className="w-12 h-12 mx-auto text-gray-300 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p>원본 콘텐츠가 없습니다</p>
      </div>
    </div>
  );
}

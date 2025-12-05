// OJT Master v2.7.0 - PDF Viewer Component
// FR-403: PDF 인앱 뷰어 (react-pdf 래퍼)

import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker 설정 (CDN 사용)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * PDF 뷰어 컴포넌트
 *
 * @param {string} url - PDF 파일 URL
 * @param {string} filename - 파일명 (다운로드용)
 * @param {boolean} isFullscreen - 전체화면 모드
 * @param {function} onClose - 닫기 콜백 (전체화면 모드)
 * @param {number} initialPage - 초기 페이지 번호
 * @param {boolean} showControls - 컨트롤 표시 여부
 */
export default function PdfViewer({
  url,
  filename = 'document.pdf',
  isFullscreen = false,
  onClose,
  initialPage = 1,
  showControls = true,
}) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // PDF 로드 완료
  const onDocumentLoadSuccess = useCallback(({ numPages: totalPages }) => {
    setNumPages(totalPages);
    setIsLoading(false);
  }, []);

  // PDF 로드 에러
  const onDocumentLoadError = useCallback((err) => {
    console.error('PDF load error:', err);
    setError('PDF를 불러올 수 없습니다');
    setIsLoading(false);
  }, []);

  // 페이지 이동
  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  };

  const goToPage = (page) => {
    const pageNum = parseInt(page, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= (numPages || 1)) {
      setPageNumber(pageNum);
    }
  };

  // 확대/축소
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1.0);

  // 다운로드
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 전체화면 토글
  const toggleFullscreen = () => {
    if (isFullscreen && onClose) {
      onClose();
    }
  };

  // 컨테이너 클래스
  const containerClass = isFullscreen
    ? 'fixed inset-0 bg-gray-900 z-50 flex flex-col'
    : 'bg-white rounded-lg border overflow-hidden';

  return (
    <div className={containerClass}>
      {/* 툴바 */}
      {showControls && (
        <div
          className={`flex items-center justify-between px-4 py-2 border-b ${
            isFullscreen ? 'bg-gray-800 text-white' : 'bg-gray-50'
          }`}
        >
          {/* 좌측: 페이지 네비게이션 */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className={`p-1.5 rounded ${
                isFullscreen
                  ? 'hover:bg-gray-700 disabled:opacity-50'
                  : 'hover:bg-gray-200 disabled:opacity-50'
              }`}
              title="이전 페이지"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="flex items-center gap-1 text-sm">
              <input
                type="number"
                min={1}
                max={numPages || 1}
                value={pageNumber}
                onChange={(e) => goToPage(e.target.value)}
                className={`w-12 text-center border rounded px-1 py-0.5 ${
                  isFullscreen ? 'bg-gray-700 border-gray-600' : ''
                }`}
              />
              <span className="text-gray-500">/ {numPages || '?'}</span>
            </div>

            <button
              onClick={goToNextPage}
              disabled={pageNumber >= (numPages || 1)}
              className={`p-1.5 rounded ${
                isFullscreen
                  ? 'hover:bg-gray-700 disabled:opacity-50'
                  : 'hover:bg-gray-200 disabled:opacity-50'
              }`}
              title="다음 페이지"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* 중앙: 확대/축소 */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className={`p-1.5 rounded ${
                isFullscreen
                  ? 'hover:bg-gray-700 disabled:opacity-50'
                  : 'hover:bg-gray-200 disabled:opacity-50'
              }`}
              title="축소"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            <button
              onClick={resetZoom}
              className={`px-2 py-0.5 text-sm rounded ${
                isFullscreen ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
              title="원래 크기"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              onClick={zoomIn}
              disabled={scale >= 3.0}
              className={`p-1.5 rounded ${
                isFullscreen
                  ? 'hover:bg-gray-700 disabled:opacity-50'
                  : 'hover:bg-gray-200 disabled:opacity-50'
              }`}
              title="확대"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>

          {/* 우측: 다운로드, 전체화면 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className={`p-1.5 rounded ${
                isFullscreen ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
              title="다운로드"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>

            {isFullscreen && onClose && (
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded hover:bg-gray-700"
                title="닫기"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* PDF 뷰어 */}
      <div
        className={`flex-1 overflow-auto flex justify-center ${
          isFullscreen ? 'bg-gray-900 p-4' : 'bg-gray-100 p-2'
        }`}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64 text-red-500">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!error && (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
            />
          </Document>
        )}
      </div>
    </div>
  );
}

/**
 * PDF 썸네일 컴포넌트
 * 첫 페이지 미리보기용
 *
 * @param {string} url - PDF 파일 URL
 * @param {function} onClick - 클릭 콜백 (전체 뷰어 열기)
 */
export function PdfThumbnail({ url, onClick }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
      style={{ width: 150, height: 200 }}
    >
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      )}

      {!error && (
        <Document
          file={url}
          onLoadSuccess={() => setIsLoaded(true)}
          onLoadError={() => setError(true)}
          loading=""
        >
          <Page pageNumber={1} width={150} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
      )}

      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition flex items-center justify-center">
        <span className="text-white opacity-0 hover:opacity-100 text-sm font-medium bg-black bg-opacity-50 px-3 py-1 rounded">
          보기
        </span>
      </div>
    </div>
  );
}

/**
 * PDF 전체화면 뷰어 모달
 *
 * @param {string} url - PDF 파일 URL
 * @param {string} filename - 파일명
 * @param {function} onClose - 닫기 콜백
 */
export function PdfViewerModal({ url, filename, onClose }) {
  return <PdfViewer url={url} filename={filename} isFullscreen={true} onClose={onClose} />;
}

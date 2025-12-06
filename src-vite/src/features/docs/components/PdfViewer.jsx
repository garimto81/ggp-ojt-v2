// OJT Master v2.7.0 - PDF Viewer Component (FR-802)
// react-pdf 기반 PDF 뷰어 (페이지 네비게이션, 확대/축소)

import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDF_CONFIG } from '../../../constants';

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_SRC;

export default function PdfViewer({ file, url, onError }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(PDF_CONFIG.DEFAULT_SCALE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = useCallback(({ numPages: total }) => {
    setNumPages(Math.min(total, PDF_CONFIG.MAX_PAGES));
    setIsLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback(
    (err) => {
      setError(err.message || 'PDF 로드 실패');
      setIsLoading(false);
      onError?.(err);
    },
    [onError]
  );

  const goToPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const goToPage = (page) => setPageNumber(Math.max(1, Math.min(numPages, page)));

  const zoomIn = () => setScale((s) => Math.min(PDF_CONFIG.MAX_SCALE, s + PDF_CONFIG.SCALE_STEP));
  const zoomOut = () => setScale((s) => Math.max(PDF_CONFIG.MIN_SCALE, s - PDF_CONFIG.SCALE_STEP));
  const resetZoom = () => setScale(PDF_CONFIG.DEFAULT_SCALE);

  // PDF 소스 결정 (file 객체 또는 URL)
  const pdfSource = file || url;

  if (!pdfSource) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        PDF 파일을 선택하세요
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="이전 페이지"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              value={pageNumber}
              onChange={(e) => goToPage(parseInt(e.target.value, 10) || 1)}
              min={1}
              max={numPages || 1}
              className="w-12 px-2 py-1 border rounded text-center"
            />
            <span className="text-gray-500">/ {numPages || '-'}</span>
          </div>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="다음 페이지"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= PDF_CONFIG.MIN_SCALE}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            title="축소"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100"
            title="원본 크기"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={scale >= PDF_CONFIG.MAX_SCALE}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            title="확대"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <span className="ml-2 text-gray-600">PDF 로딩 중...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-red-500">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p>{error}</p>
          </div>
        )}

        <Document
          file={pdfSource}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
}

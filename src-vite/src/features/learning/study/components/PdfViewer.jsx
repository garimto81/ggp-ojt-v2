/**
 * PdfViewer - 학습용 PDF 뷰어
 * @agent learning-study-agent
 * @blocks learning.study.pdf
 * @issue #200 - Context API 기반 퀴즈 생성
 *
 * source_type='pdf'인 문서에서 PDF 원본을 표시합니다.
 * Online PDF URL 또는 로컬 파일명을 처리합니다.
 */

import { useState, useCallback } from 'react';

import { Document, Page, pdfjs } from 'react-pdf';

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// PDF 설정
const PDF_CONFIG = {
  DEFAULT_SCALE: 1.0,
  MIN_SCALE: 0.5,
  MAX_SCALE: 2.5,
  SCALE_STEP: 0.25,
  MAX_PAGES: 100,
};

/**
 * 학습용 PDF 뷰어
 * @param {Object} props
 * @param {string} props.url - PDF URL (source_url)
 * @param {string} props.fileName - 로컬 파일명 (source_file)
 * @param {string} props.title - 문서 제목
 * @param {string} props.className - 추가 CSS 클래스
 */
export default function PdfViewer({ url, fileName, title, className = '' }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(PDF_CONFIG.DEFAULT_SCALE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // PDF 소스 결정
  const pdfSource = url || null;

  const onDocumentLoadSuccess = useCallback(({ numPages: total }) => {
    setNumPages(Math.min(total, PDF_CONFIG.MAX_PAGES));
    setIsLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    console.error('[PdfViewer] 로드 실패:', err);
    setError(err.message || 'PDF 로드 실패');
    setIsLoading(false);
  }, []);

  // 네비게이션
  const goToPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const goToPage = (page) => setPageNumber(Math.max(1, Math.min(numPages, page)));

  // 줌 컨트롤
  const zoomIn = () => setScale((s) => Math.min(PDF_CONFIG.MAX_SCALE, s + PDF_CONFIG.SCALE_STEP));
  const zoomOut = () => setScale((s) => Math.max(PDF_CONFIG.MIN_SCALE, s - PDF_CONFIG.SCALE_STEP));
  const resetZoom = () => setScale(PDF_CONFIG.DEFAULT_SCALE);

  // 새 탭에서 열기
  const openInNewTab = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // PDF URL이 없는 경우 (로컬 파일만 있는 경우)
  if (!pdfSource) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg bg-gray-50 p-8 ${className}`}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13.5l1.5 1.5-1.5 1.5L7 15l1.5-1.5zm7 1.5l-1.5 1.5L12.5 15l1.5-1.5 1.5 1.5zM11 18h2v-2h-2v2z" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium text-gray-700">PDF 파일 정보</h3>
        <p className="mb-4 text-center text-sm text-gray-500">
          파일명: {fileName || '알 수 없음'}
          <br />
          <span className="text-xs text-gray-400">
            로컬 PDF 파일은 학습 시 뷰어에서 표시되지 않습니다.
          </span>
        </p>
        <p className="rounded bg-amber-50 px-4 py-2 text-xs text-amber-600">
          💡 퀴즈를 통해 학습 내용을 확인해주세요.
        </p>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg bg-gray-50 p-8 ${className}`}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-500"
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
        </div>
        <h3 className="mb-2 text-lg font-medium text-gray-700">PDF 로드 실패</h3>
        <p className="mb-4 text-sm text-gray-500">{error}</p>
        {url && (
          <button
            onClick={openInNewTab}
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-2 text-white transition hover:bg-blue-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            새 탭에서 열기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col overflow-hidden rounded-lg bg-gray-100 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        {/* 제목 & 파일 정보 */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
            <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-gray-800">{title || 'PDF 문서'}</h3>
          </div>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || isLoading}
            className="rounded p-1.5 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            title="이전 페이지"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              disabled={isLoading}
              className="w-10 rounded border px-1 py-0.5 text-center text-sm"
            />
            <span className="text-gray-500">/ {numPages || '-'}</span>
          </div>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || isLoading}
            className="rounded p-1.5 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            title="다음 페이지"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={scale <= PDF_CONFIG.MIN_SCALE || isLoading}
            className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-50"
            title="축소"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={resetZoom}
            className="rounded px-2 py-0.5 text-xs hover:bg-gray-100"
            title="원본 크기"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={scale >= PDF_CONFIG.MAX_SCALE || isLoading}
            className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-50"
            title="확대"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          {url && (
            <button
              onClick={openInNewTab}
              className="ml-2 rounded p-1.5 hover:bg-gray-100"
              title="새 탭에서 열기"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* PDF Content */}
      <div className="min-h-[500px] flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
            <span className="ml-2 text-gray-600">PDF 로딩 중...</span>
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

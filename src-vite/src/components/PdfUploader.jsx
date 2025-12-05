// OJT Master v2.7.0 - PDF Uploader Component
// FR-201: PDF 업로드 UI

import { useState, useRef, useCallback } from 'react';
import { Toast } from '../contexts/ToastContext';
import { R2_CONFIG } from '../constants';
import { PdfThumbnail } from './PdfViewer';

// PDF 파일 검증 상수
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['application/pdf'];
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF

/**
 * PDF 업로더 컴포넌트
 * 드래그 앤 드롭 지원, 파일 검증, 업로드 진행률 표시
 *
 * @param {function} onUploadComplete - 업로드 완료 콜백 ({ url, key, filename, pageCount })
 * @param {function} onError - 에러 콜백
 * @param {string} existingUrl - 기존 파일 URL (수정 시)
 */
export default function PdfUploader({ onUploadComplete, onError, existingUrl }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(
    existingUrl ? { url: existingUrl, filename: 'document.pdf' } : null
  );
  const [selectedFile, setSelectedFile] = useState(null);

  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 파일 검증
  const validateFile = async (file) => {
    // 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('PDF 파일만 업로드할 수 있습니다');
    }

    // 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과할 수 없습니다`);
    }

    // 매직 넘버 검증
    const buffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isValidPdf = PDF_MAGIC_BYTES.every((byte, i) => bytes[i] === byte);

    if (!isValidPdf) {
      throw new Error('유효한 PDF 파일이 아닙니다');
    }

    return true;
  };

  // 파일 선택 처리
  const handleFileSelect = async (file) => {
    try {
      await validateFile(file);
      setSelectedFile(file);
    } catch (error) {
      Toast.error(error.message);
      onError?.(error.message);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 파일 입력 변경
  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 업로드 실행
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    abortControllerRef.current = new AbortController();

    try {
      // 1단계: 업로드 키 요청
      const initResponse = await fetch(R2_CONFIG.WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(errorData.error || '업로드 초기화 실패');
      }

      const { key, publicUrl } = await initResponse.json();
      setUploadProgress(20);

      // 2단계: 파일 업로드
      const uploadResponse = await fetch(`${R2_CONFIG.WORKER_URL}/upload`, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type,
          'X-Upload-Key': key,
        },
        body: selectedFile,
        signal: abortControllerRef.current.signal,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || '파일 업로드 실패');
      }

      setUploadProgress(100);

      const result = {
        url: publicUrl,
        key,
        filename: selectedFile.name,
        fileSize: selectedFile.size,
      };

      setUploadedFile(result);
      setSelectedFile(null);
      onUploadComplete?.(result);
      Toast.success('PDF가 업로드되었습니다');
    } catch (error) {
      if (error.name === 'AbortError') {
        Toast.warning('업로드가 취소되었습니다');
      } else {
        Toast.error(`업로드 실패: ${error.message}`);
        onError?.(error.message);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  }, [selectedFile, onUploadComplete, onError]);

  // 업로드 취소
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSelectedFile(null);
    setIsUploading(false);
    setUploadProgress(0);
  };

  // 파일 제거
  const handleRemove = () => {
    setUploadedFile(null);
    setSelectedFile(null);
  };

  // 업로드 완료 상태
  if (uploadedFile) {
    return (
      <div className="border rounded-lg p-4 bg-green-50 border-green-200">
        <div className="flex items-start gap-4">
          <PdfThumbnail
            url={uploadedFile.url}
            onClick={() => window.open(uploadedFile.url, '_blank')}
          />
          <div className="flex-1">
            <p className="font-medium text-gray-800">{uploadedFile.filename}</p>
            {uploadedFile.fileSize && (
              <p className="text-sm text-gray-500">
                {(uploadedFile.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <a
                href={uploadedFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                전체 보기
              </a>
              <button onClick={handleRemove} className="text-sm text-red-500 hover:text-red-700">
                제거
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 파일 선택됨 (업로드 대기)
  if (selectedFile) {
    return (
      <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-medium text-gray-800">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          {!isUploading && (
            <button
              onClick={() => setSelectedFile(null)}
              className="text-gray-400 hover:text-gray-600"
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

        {isUploading ? (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{uploadProgress}%</span>
              <button onClick={handleCancel} className="text-sm text-red-500 hover:text-red-700">
                취소
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={handleUpload}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            업로드
          </button>
        )}
      </div>
    );
  }

  // 파일 선택 영역
  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      <svg
        className="w-12 h-12 mx-auto text-gray-400 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>

      <p className="text-gray-600 mb-1">
        {isDragging ? 'PDF 파일을 여기에 놓으세요' : 'PDF 파일을 드래그하거나 클릭하여 선택'}
      </p>
      <p className="text-xs text-gray-400">최대 50MB</p>
    </div>
  );
}

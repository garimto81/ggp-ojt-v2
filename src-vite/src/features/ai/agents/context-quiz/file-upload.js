/**
 * Context Quiz Agent - Gemini Files API 업로드
 * @agent context-quiz-agent
 * @blocks ai.quiz.upload
 * @issue #200 - Context API 기반 퀴즈 생성
 *
 * Gemini Files API를 사용하여 로컬 PDF 파일을 업로드합니다.
 * 업로드된 파일은 48시간 동안 유효합니다.
 *
 * @see https://ai.google.dev/api/files
 */

import { GEMINI_CONFIG } from '@/constants';

/**
 * Gemini Files API 엔드포인트
 */
const FILES_API_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

/**
 * 지원되는 MIME 타입
 */
export const SUPPORTED_MIME_TYPES = {
  PDF: 'application/pdf',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WEBP: 'image/webp',
  TEXT: 'text/plain',
  HTML: 'text/html',
  CSV: 'text/csv',
  JSON: 'application/json',
};

/**
 * 파일을 Gemini Files API에 업로드
 * @param {File} file - 업로드할 파일
 * @param {Object} options - 옵션
 * @param {Function} options.onProgress - 진행률 콜백
 * @returns {Promise<Object>} 업로드된 파일 정보 { uri, name, mimeType, sizeBytes, createTime, expirationTime }
 */
export async function uploadToGeminiFiles(file, options = {}) {
  const { onProgress } = options;

  if (!GEMINI_CONFIG.API_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다');
  }

  // 파일 타입 검증
  const mimeType = file.type || getMimeType(file.name);
  if (!Object.values(SUPPORTED_MIME_TYPES).includes(mimeType)) {
    throw new Error(`지원하지 않는 파일 형식입니다: ${mimeType}`);
  }

  // 파일 크기 검증 (50MB 제한)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`파일 크기가 50MB를 초과합니다: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  onProgress?.('파일 업로드 준비 중...');

  try {
    // multipart/form-data로 업로드
    const formData = new FormData();
    formData.append('file', file);

    onProgress?.('Gemini Files API로 업로드 중...');

    const response = await fetch(`${FILES_API_URL}?key=${GEMINI_CONFIG.API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `업로드 실패: ${response.status}`);
    }

    const result = await response.json();
    onProgress?.('업로드 완료');

    return {
      uri: result.file?.uri,
      name: result.file?.name,
      mimeType: result.file?.mimeType,
      sizeBytes: result.file?.sizeBytes,
      createTime: result.file?.createTime,
      expirationTime: result.file?.expirationTime,
    };
  } catch (error) {
    console.error('[context-quiz] 파일 업로드 실패:', error);
    throw error;
  }
}

/**
 * 업로드된 파일 정보 조회
 * @param {string} fileName - 파일 이름 (files/xxx 형식)
 * @returns {Promise<Object>} 파일 정보
 */
export async function getFileInfo(fileName) {
  if (!GEMINI_CONFIG.API_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_CONFIG.API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`파일 조회 실패: ${response.status}`);
  }

  return response.json();
}

/**
 * 업로드된 파일 삭제
 * @param {string} fileName - 파일 이름 (files/xxx 형식)
 * @returns {Promise<void>}
 */
export async function deleteFile(fileName) {
  if (!GEMINI_CONFIG.API_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_CONFIG.API_KEY}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error(`파일 삭제 실패: ${response.status}`);
  }
}

/**
 * 파일 확장자로 MIME 타입 추론
 * @param {string} filename - 파일명
 * @returns {string} MIME 타입
 */
function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap = {
    pdf: SUPPORTED_MIME_TYPES.PDF,
    png: SUPPORTED_MIME_TYPES.PNG,
    jpg: SUPPORTED_MIME_TYPES.JPEG,
    jpeg: SUPPORTED_MIME_TYPES.JPEG,
    webp: SUPPORTED_MIME_TYPES.WEBP,
    txt: SUPPORTED_MIME_TYPES.TEXT,
    html: SUPPORTED_MIME_TYPES.HTML,
    htm: SUPPORTED_MIME_TYPES.HTML,
    csv: SUPPORTED_MIME_TYPES.CSV,
    json: SUPPORTED_MIME_TYPES.JSON,
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * 파일이 PDF인지 확인
 * @param {File|string} fileOrUrl - 파일 또는 URL
 * @returns {boolean}
 */
export function isPdf(fileOrUrl) {
  if (fileOrUrl instanceof File) {
    return (
      fileOrUrl.type === SUPPORTED_MIME_TYPES.PDF || fileOrUrl.name.toLowerCase().endsWith('.pdf')
    );
  }
  if (typeof fileOrUrl === 'string') {
    return fileOrUrl.toLowerCase().endsWith('.pdf');
  }
  return false;
}

/**
 * URL이 PDF URL인지 확인
 * @param {string} url - URL 문자열
 * @returns {boolean}
 */
export function isPdfUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return url.toLowerCase().endsWith('.pdf');
  }
}

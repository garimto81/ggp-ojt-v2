/**
 * Supabase Storage 유틸리티
 * @agent content-create-agent
 * @blocks storage.pdf
 * @issue #202 - PDF 파일 Supabase Storage 저장
 *
 * PDF 파일을 Supabase Storage에 업로드하고 관리합니다.
 * 압축 없이 원본 저장 (PDF는 이미 압축된 포맷)
 */

import { supabase } from './supabaseClient';

/**
 * Storage 버킷 이름
 */
export const STORAGE_BUCKET = 'pdfs';

/**
 * Storage 설정
 */
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB (Supabase Free 제한)
  ALLOWED_MIME_TYPES: ['application/pdf'],
  CACHE_CONTROL: '3600', // 1시간 CDN 캐시
};

/**
 * 파일 크기 검증
 * @param {File} file - 검증할 파일
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFileSize(file) {
  if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxMB = (STORAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
    return {
      valid: false,
      error: `파일 크기가 ${maxMB}MB를 초과합니다 (현재: ${sizeMB}MB)`,
    };
  }
  return { valid: true };
}

/**
 * 파일 타입 검증
 * @param {File} file - 검증할 파일
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFileType(file) {
  const isPdf =
    STORAGE_CONFIG.ALLOWED_MIME_TYPES.includes(file.type) ||
    file.name.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    return {
      valid: false,
      error: `지원하지 않는 파일 형식입니다. PDF 파일만 업로드 가능합니다.`,
    };
  }
  return { valid: true };
}

/**
 * 파일 검증 (크기 + 타입)
 * @param {File} file - 검증할 파일
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFile(file) {
  const sizeResult = validateFileSize(file);
  if (!sizeResult.valid) return sizeResult;

  const typeResult = validateFileType(file);
  if (!typeResult.valid) return typeResult;

  return { valid: true };
}

/**
 * 안전한 파일 경로 생성
 * @param {string} docId - 문서 ID
 * @param {string} fileName - 원본 파일명
 * @returns {string} 저장 경로
 */
export function generateStoragePath(docId, fileName) {
  // 파일명에서 특수문자 제거 (공백은 언더스코어로)
  const safeFileName = fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_').replace(/\s+/g, '_');

  // 타임스탬프 추가로 중복 방지
  const timestamp = Date.now();

  return `documents/${docId}/${timestamp}_${safeFileName}`;
}

/**
 * PDF 파일을 Supabase Storage에 업로드
 * @param {File} file - 업로드할 PDF 파일
 * @param {string} docId - 연결할 문서 ID
 * @param {Object} options - 옵션
 * @param {Function} options.onProgress - 진행률 콜백
 * @returns {Promise<{ path: string, publicUrl: string }>}
 */
export async function uploadPdfToStorage(file, docId, options = {}) {
  const { onProgress } = options;

  // 1. 파일 검증
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  onProgress?.('파일 검증 완료');

  // 2. 저장 경로 생성
  const storagePath = generateStoragePath(docId, file.name);

  onProgress?.('Supabase Storage 업로드 중...');

  // 3. Supabase Storage 업로드
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
    cacheControl: STORAGE_CONFIG.CACHE_CONTROL,
    upsert: false, // 중복 방지
  });

  if (error) {
    console.error('[Storage] 업로드 실패:', error);

    // 에러 메시지 사용자 친화적으로 변환
    if (error.message?.includes('exceeded')) {
      throw new Error('스토리지 용량이 부족합니다. 관리자에게 문의하세요.');
    }
    if (error.message?.includes('not found') || error.message?.includes('bucket')) {
      throw new Error('스토리지 버킷이 설정되지 않았습니다. 관리자에게 문의하세요.');
    }
    if (error.message?.includes('policy') || error.message?.includes('permission')) {
      throw new Error('파일 업로드 권한이 없습니다. Mentor 계정으로 로그인하세요.');
    }

    throw new Error(`업로드 실패: ${error.message}`);
  }

  onProgress?.('Public URL 생성 중...');

  // 4. Public URL 생성
  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);

  onProgress?.('업로드 완료');

  return {
    path: data.path,
    publicUrl,
  };
}

/**
 * Storage에서 파일 삭제
 * @param {string} storagePath - 삭제할 파일 경로
 * @returns {Promise<void>}
 */
export async function deleteFromStorage(storagePath) {
  if (!storagePath) return;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);

  if (error) {
    console.error('[Storage] 삭제 실패:', error);
    throw new Error(`파일 삭제 실패: ${error.message}`);
  }
}

/**
 * Storage 경로에서 Public URL 가져오기
 * @param {string} storagePath - 파일 경로
 * @returns {string | null} Public URL
 */
export function getPublicUrl(storagePath) {
  if (!storagePath) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  return publicUrl;
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 * @param {number} bytes - 바이트 수
 * @returns {string} 포맷된 크기 (예: "2.5 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

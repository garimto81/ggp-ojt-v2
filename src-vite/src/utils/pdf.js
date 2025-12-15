// OJT Master - PDF Text Extraction Utility
// Issue #198: PDF 업로드 및 텍스트 추출 기능
// Issue #217: 이미지 전용 PDF OCR 지원 (Tesseract.js)
//
// pdfjs-dist를 직접 사용하여 PDF에서 텍스트 추출
// 텍스트가 없는 이미지 PDF의 경우 OCR fallback 수행
// react-pdf의 PdfViewer.jsx는 뷰어용, 이 파일은 텍스트 추출용

import * as pdfjsLib from 'pdfjs-dist';

import { CONFIG } from '../constants';

import { extractTextWithOcr, isValidOcrText } from './ocr';

// PDF.js Worker 설정 (CDN 사용)
// Note: package.json의 pdfjs-dist 버전과 맞춰야 함 (현재 5.4.449)
const PDFJS_VERSION = '5.4.449';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

// PDF 설정
const PDF_EXTRACT_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_PAGES: 100,
  MAX_TEXT_LENGTH: CONFIG.MAX_URL_EXTRACT_CHARS || 15000,
};

/**
 * PDF 파일 유효성 검사
 * @param {File} file - PDF 파일 객체
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePdfFile(file) {
  if (!file) {
    return { valid: false, error: 'PDF 파일을 선택해주세요.' };
  }

  // 파일 타입 검사
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'PDF 파일만 업로드 가능합니다.' };
  }

  // 파일 크기 검사
  if (file.size > PDF_EXTRACT_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = PDF_EXTRACT_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    return { valid: false, error: `파일 크기가 ${maxSizeMB}MB를 초과합니다.` };
  }

  return { valid: true };
}

/**
 * PDF 파일에서 텍스트 추출
 * @param {File} file - PDF 파일 객체
 * @param {Function} [onProgress] - 진행률 콜백 (0-100)
 * @returns {Promise<{
 *   text: string,
 *   pages: number,
 *   totalPages: number,
 *   wasTruncated: boolean,
 *   originalLength: number,
 *   extractedLength: number
 * }>}
 */
export async function extractPdfText(file, onProgress) {
  // 파일 유효성 검사
  const validation = validatePdfFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    // ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();

    // PDF 문서 로드
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      // 폰트 로딩 비활성화 (텍스트 추출에는 불필요)
      disableFontFace: true,
      // 범위 요청 비활성화 (로컬 파일)
      disableRange: true,
    });

    const pdf = await loadingTask.promise;

    const totalPages = pdf.numPages;
    const pagesToProcess = Math.min(totalPages, PDF_EXTRACT_CONFIG.MAX_PAGES);

    if (totalPages > PDF_EXTRACT_CONFIG.MAX_PAGES) {
      console.warn(
        `PDF가 ${totalPages}페이지입니다. 처음 ${PDF_EXTRACT_CONFIG.MAX_PAGES}페이지만 처리합니다.`
      );
    }

    let fullText = '';
    const pageTexts = [];

    // 각 페이지에서 텍스트 추출
    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // 텍스트 아이템을 문자열로 결합
      const pageText = textContent.items
        .filter((item) => item.str) // 빈 문자열 필터
        .map((item) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ') // 연속 공백 정리
        .trim();

      if (pageText) {
        pageTexts.push(pageText);
        fullText += pageText + '\n\n';
      }

      // 진행률 콜백 호출
      if (onProgress) {
        const progress = Math.round((pageNum / pagesToProcess) * 100);
        onProgress(progress);
      }
    }

    // 전체 텍스트 정리
    fullText = fullText.trim();

    // 텍스트가 없거나 너무 짧은 경우 OCR fallback 시도 (#217)
    if (!fullText || fullText.length < 100) {
      if (onProgress) {
        onProgress(0); // 진행률 리셋
      }

      console.warn('[PDF] 텍스트 레이어 없음, OCR fallback 시도...');

      try {
        // OCR로 텍스트 추출 시도
        const ocrResult = await extractTextWithOcr(pdf, (status) => {
          // OCR 상태를 진행률 대신 로그로 출력 (onProgress는 숫자만 받음)
          console.log('[OCR]', status);
        });

        if (ocrResult.text && isValidOcrText(ocrResult.text)) {
          const ocrText = ocrResult.text.substring(0, PDF_EXTRACT_CONFIG.MAX_TEXT_LENGTH);
          const ocrWasTruncated = ocrResult.text.length > PDF_EXTRACT_CONFIG.MAX_TEXT_LENGTH;

          if (onProgress) {
            onProgress(100);
          }

          return {
            text: ocrText,
            pages: ocrResult.pages,
            totalPages,
            wasTruncated: ocrWasTruncated,
            originalLength: ocrResult.text.length,
            extractedLength: ocrText.length,
            method: 'ocr', // OCR 사용 표시
          };
        }
      } catch (ocrError) {
        console.error('[OCR] OCR 처리 실패:', ocrError);
      }

      // OCR도 실패한 경우
      throw new Error(
        'PDF에서 텍스트를 추출할 수 없습니다. 이미지 품질이 낮거나 지원하지 않는 형식일 수 있습니다.'
      );
    }

    const originalLength = fullText.length;

    // 최대 길이 제한
    const truncatedText = fullText.substring(0, PDF_EXTRACT_CONFIG.MAX_TEXT_LENGTH);
    const wasTruncated = originalLength > PDF_EXTRACT_CONFIG.MAX_TEXT_LENGTH;

    return {
      text: truncatedText,
      pages: pagesToProcess,
      totalPages,
      wasTruncated,
      originalLength,
      extractedLength: truncatedText.length,
      pageTexts, // 디버깅용 (옵션)
      method: 'text-layer', // 텍스트 레이어 사용 표시
    };
  } catch (error) {
    // PDF.js 에러 처리
    if (error.name === 'PasswordException') {
      throw new Error('비밀번호로 보호된 PDF입니다. 비밀번호 없이 열 수 없습니다.');
    }
    if (error.name === 'InvalidPDFException') {
      throw new Error('유효하지 않은 PDF 파일입니다.');
    }
    // 기타 에러는 그대로 전달
    throw error;
  }
}

/**
 * PDF 파일 정보 가져오기 (메타데이터)
 * @param {File} file - PDF 파일 객체
 * @returns {Promise<{
 *   title: string,
 *   author: string,
 *   subject: string,
 *   pages: number,
 *   fileSize: number,
 *   fileName: string
 * }>}
 */
export async function getPdfInfo(file) {
  const validation = validatePdfFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const metadata = await pdf.getMetadata();

  return {
    title: metadata.info?.Title || file.name.replace('.pdf', ''),
    author: metadata.info?.Author || '',
    subject: metadata.info?.Subject || '',
    pages: pdf.numPages,
    fileSize: file.size,
    fileName: file.name,
  };
}

export { PDF_EXTRACT_CONFIG };

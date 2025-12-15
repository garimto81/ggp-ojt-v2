/**
 * OCR 유틸리티 - Tesseract.js 기반 이미지 텍스트 인식
 * @agent content-create-agent
 * @blocks ocr.tesseract
 * @issue #217 - 이미지 전용 PDF OCR 지원
 *
 * 이미지 기반 PDF에서 텍스트를 추출합니다.
 * Tesseract.js v6 사용 (WebAssembly 기반)
 */

import Tesseract from 'tesseract.js';

/**
 * OCR 설정
 */
export const OCR_CONFIG = {
  // 지원 언어 (한국어 + 영어)
  LANGUAGES: 'kor+eng',
  // 최대 처리 페이지 수 (OCR은 느리므로 제한)
  MAX_PAGES: 10,
  // 이미지 렌더링 스케일 (높을수록 정확하지만 느림)
  RENDER_SCALE: 2.0,
  // Worker 수 (병렬 처리)
  NUM_WORKERS: 1,
};

/**
 * Tesseract Worker 인스턴스 (재사용을 위해 캐시)
 */
let cachedWorker = null;

/**
 * Tesseract Worker 가져오기 (싱글톤 패턴)
 * @param {Function} [onProgress] - 진행률 콜백
 * @returns {Promise<Tesseract.Worker>}
 */
async function getWorker(onProgress) {
  if (cachedWorker) {
    return cachedWorker;
  }

  onProgress?.('OCR 엔진 초기화 중...');

  cachedWorker = await Tesseract.createWorker(OCR_CONFIG.LANGUAGES, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const percent = Math.round(m.progress * 100);
        onProgress?.(`OCR 처리 중... ${percent}%`);
      }
    },
  });

  return cachedWorker;
}

/**
 * Worker 종료 (메모리 해제)
 */
export async function terminateOcrWorker() {
  if (cachedWorker) {
    await cachedWorker.terminate();
    cachedWorker = null;
  }
}

/**
 * PDF 페이지를 이미지로 렌더링
 * @param {PDFPageProxy} page - PDF.js 페이지 객체
 * @param {number} scale - 렌더링 스케일
 * @returns {Promise<HTMLCanvasElement>}
 */
async function renderPageToCanvas(page, scale = OCR_CONFIG.RENDER_SCALE) {
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas;
}

/**
 * 단일 이미지에서 OCR 수행
 * @param {HTMLCanvasElement|string} image - Canvas 또는 이미지 URL
 * @param {Function} [onProgress] - 진행률 콜백
 * @returns {Promise<string>} 추출된 텍스트
 */
export async function recognizeImage(image, onProgress) {
  const worker = await getWorker(onProgress);

  const {
    data: { text },
  } = await worker.recognize(image);

  return text.trim();
}

/**
 * PDF 문서에서 OCR로 텍스트 추출
 * @param {PDFDocumentProxy} pdf - PDF.js 문서 객체
 * @param {Function} [onProgress] - 진행률 콜백 (status: string)
 * @returns {Promise<{
 *   text: string,
 *   pages: number,
 *   method: 'ocr'
 * }>}
 */
export async function extractTextWithOcr(pdf, onProgress) {
  const totalPages = pdf.numPages;
  const pagesToProcess = Math.min(totalPages, OCR_CONFIG.MAX_PAGES);

  if (totalPages > OCR_CONFIG.MAX_PAGES) {
    console.warn(
      `[OCR] PDF가 ${totalPages}페이지입니다. OCR 처리 시간 관계로 처음 ${OCR_CONFIG.MAX_PAGES}페이지만 처리합니다.`
    );
  }

  onProgress?.('OCR 엔진 준비 중...');

  const worker = await getWorker(onProgress);
  const pageTexts = [];

  for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
    onProgress?.(`페이지 ${pageNum}/${pagesToProcess} 렌더링 중...`);

    const page = await pdf.getPage(pageNum);
    const canvas = await renderPageToCanvas(page);

    onProgress?.(`페이지 ${pageNum}/${pagesToProcess} OCR 처리 중...`);

    const {
      data: { text },
    } = await worker.recognize(canvas);

    const cleanedText = text
      .trim()
      .replace(/\s+/g, ' ') // 연속 공백 정리
      .replace(/\n{3,}/g, '\n\n'); // 연속 줄바꿈 정리

    if (cleanedText) {
      pageTexts.push(cleanedText);
    }

    // Canvas 메모리 해제
    canvas.width = 0;
    canvas.height = 0;
  }

  const fullText = pageTexts.join('\n\n').trim();

  return {
    text: fullText,
    pages: pagesToProcess,
    method: 'ocr',
  };
}

/**
 * 텍스트가 의미 있는 내용인지 검사
 * (OCR 결과가 노이즈인지 실제 텍스트인지 판별)
 * @param {string} text - 검사할 텍스트
 * @returns {boolean}
 */
export function isValidOcrText(text) {
  if (!text || text.length < 50) {
    return false;
  }

  // 알파벳/한글 비율 체크 (최소 30% 이상이어야 유효)
  const alphanumericMatches = text.match(/[a-zA-Z가-힣0-9]/g) || [];
  const ratio = alphanumericMatches.length / text.length;

  return ratio > 0.3;
}

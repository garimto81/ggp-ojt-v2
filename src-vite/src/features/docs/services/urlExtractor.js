// OJT Master - URL Text Extractor (Issue #59)
// URL에서 텍스트 추출 (CORS 프록시 사용)

import { CONFIG } from '../../../constants';
import { validateUrlForSSRF } from '../../../utils/security/validateUrl';

/**
 * Extract text from URL using CORS proxy (FR-801)
 * 우선순위: 자체 R2 Worker > allorigins > corsproxy
 * @param {string} url - URL to extract text from
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{text: string, wasTruncated: boolean, originalLength: number, extractedLength: number, metadata: Object}>}
 */
export async function extractUrlText(url, onProgress) {
  // SSRF validation
  if (!validateUrlForSSRF(url)) {
    throw new Error('허용되지 않는 URL입니다.');
  }

  if (onProgress) onProgress('URL에서 텍스트 추출 중...');

  // 동적 import로 순환 참조 방지
  const { fetchWithCorsProxy, extractTextContent, extractMetadata } = await import(
    '../../../utils/cors-proxy.js'
  );

  try {
    const html = await fetchWithCorsProxy(url);

    // 메타데이터 추출
    const metadata = extractMetadata(html);

    // 본문 텍스트 추출
    const result = extractTextContent(html, CONFIG.MAX_URL_EXTRACT_CHARS);

    return {
      ...result,
      metadata,
    };
  } catch (error) {
    throw new Error(`URL 텍스트 추출 실패: ${error.message}`);
  }
}

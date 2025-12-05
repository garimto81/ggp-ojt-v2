// OJT Master v2.7.0 - CORS Proxy Client (FR-801)
// 자체 R2 Worker 프록시를 우선 사용, 실패 시 외부 프록시로 폴백

import { R2_CONFIG, CORS_PROXIES } from '../constants';

/**
 * CORS 프록시를 통해 URL 콘텐츠 가져오기
 * 우선순위: 자체 R2 Worker > allorigins > corsproxy
 * @param {string} url - 가져올 URL
 * @returns {Promise<string>} - HTML 콘텐츠
 */
export async function fetchWithCorsProxy(url) {
  const errors = [];

  // 1. 자체 R2 Worker 프록시 시도 (가장 안정적)
  try {
    const workerUrl = R2_CONFIG.WORKER_URL;
    if (workerUrl && !workerUrl.includes('your-worker')) {
      const response = await fetch(`${workerUrl}/proxy?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        return await response.text();
      }
      errors.push(`R2 Worker: ${response.status}`);
    }
  } catch (error) {
    errors.push(`R2 Worker: ${error.message}`);
  }

  // 2. 외부 CORS 프록시로 폴백
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url));
      if (response.ok) {
        return await response.text();
      }
      errors.push(`${proxy}: ${response.status}`);
    } catch (error) {
      errors.push(`${proxy}: ${error.message}`);
    }
  }

  throw new Error(`모든 프록시 실패: ${errors.join(', ')}`);
}

/**
 * URL에서 메타데이터 추출
 * @param {string} html - HTML 콘텐츠
 * @returns {Object} - 메타데이터 (title, description, image, favicon)
 */
export function extractMetadata(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const getMetaContent = (selectors) => {
    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      if (el) {
        return el.getAttribute('content') || el.textContent?.trim();
      }
    }
    return null;
  };

  return {
    title: getMetaContent(['meta[property="og:title"]', 'meta[name="twitter:title"]', 'title']),
    description: getMetaContent([
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ]),
    image: getMetaContent(['meta[property="og:image"]', 'meta[name="twitter:image"]']),
    favicon:
      doc.querySelector('link[rel="icon"]')?.href ||
      doc.querySelector('link[rel="shortcut icon"]')?.href,
    siteName: getMetaContent(['meta[property="og:site_name"]']),
  };
}

/**
 * HTML에서 본문 텍스트 추출
 * @param {string} html - HTML 콘텐츠
 * @param {number} maxLength - 최대 길이 (기본: 15000)
 * @returns {Object} - { text, wasTruncated, originalLength, extractedLength }
 */
export function extractTextContent(html, maxLength = 15000) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // 불필요한 요소 제거
  const removeSelectors = [
    'script',
    'style',
    'nav',
    'footer',
    'header',
    'aside',
    'iframe',
    'noscript',
    '[role="navigation"]',
    '[role="banner"]',
    '.sidebar',
    '.advertisement',
    '.ad',
    '#comments',
  ];
  removeSelectors.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((el) => el.remove());
  });

  // 본문 추출 (우선순위: article > main > body)
  const contentEl =
    doc.querySelector('article') ||
    doc.querySelector('main') ||
    doc.querySelector('[role="main"]') ||
    doc.body;

  const text = contentEl?.textContent?.trim() || '';
  const originalLength = text.length;
  const truncatedText = text.substring(0, maxLength);

  return {
    text: truncatedText,
    wasTruncated: originalLength > maxLength,
    originalLength,
    extractedLength: truncatedText.length,
  };
}

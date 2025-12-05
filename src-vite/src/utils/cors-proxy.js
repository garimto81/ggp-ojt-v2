// OJT Master v2.8.0 - CORS Proxy Client
// PRD-0008: 자체 CORS 프록시 클라이언트 (R2 Worker 우선, 폴백 지원)

import { CORS_CONFIG, CONFIG } from '../constants';

/**
 * 타임아웃이 있는 fetch
 */
async function fetchWithTimeout(url, options = {}, timeout = CORS_CONFIG.TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * HTML에서 메타데이터 추출
 */
function extractMetadata(html) {
  const metadata = {
    title: null,
    description: null,
    image: null,
    siteName: null,
  };

  // <title> 태그
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }

  // Open Graph 태그
  const ogPatterns = [
    { key: 'title', pattern: /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i },
    {
      key: 'description',
      pattern: /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    },
    { key: 'image', pattern: /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i },
    {
      key: 'siteName',
      pattern: /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    },
  ];

  // content가 앞에 오는 패턴도 처리
  const ogPatternsAlt = [
    { key: 'title', pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i },
    {
      key: 'description',
      pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    },
    { key: 'image', pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i },
    {
      key: 'siteName',
      pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
    },
  ];

  for (const { key, pattern } of [...ogPatterns, ...ogPatternsAlt]) {
    if (!metadata[key]) {
      const match = html.match(pattern);
      if (match) {
        metadata[key] = match[1].trim();
      }
    }
  }

  // description fallback (meta description)
  if (!metadata.description) {
    const descMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    );
    if (descMatch) {
      metadata.description = descMatch[1].trim();
    }
  }

  return metadata;
}

/**
 * HTML에서 텍스트 콘텐츠 추출
 */
function extractTextContent(html) {
  // script, style, noscript 태그 제거
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

  // HTML 태그 제거
  text = text.replace(/<[^>]+>/g, ' ');

  // HTML 엔티티 디코딩
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num));

  // 연속 공백/줄바꿈 정리
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * HTML 파싱 및 콘텐츠 추출
 */
function parseHtmlContent(html, maxChars = CONFIG.MAX_URL_EXTRACT_CHARS) {
  const metadata = extractMetadata(html);
  let text = extractTextContent(html);

  const originalLength = text.length;
  let wasTruncated = false;

  // 최대 길이 제한
  if (text.length > maxChars) {
    text = text.slice(0, maxChars);
    wasTruncated = true;
  }

  return {
    ...metadata,
    text,
    originalLength,
    extractedLength: text.length,
    wasTruncated,
  };
}

/**
 * URL 콘텐츠 추출 (메인 함수)
 * @param {string} url - 추출할 URL
 * @param {Object} options - 옵션
 * @param {function} options.onProgress - 진행 상태 콜백
 * @returns {Promise<Object>} - 추출 결과
 */
export async function extractUrlContent(url, options = {}) {
  const { onProgress } = options;
  let html = null;
  let proxyUsed = 'unknown';
  let lastError = null;

  // 1. 자체 Worker 프록시 시도 (PRD-0008)
  if (CORS_CONFIG.WORKER_PROXY) {
    onProgress?.('자체 프록시 연결 중...');
    try {
      const proxyUrl = `${CORS_CONFIG.WORKER_PROXY}?url=${encodeURIComponent(url)}`;
      const response = await fetchWithTimeout(proxyUrl);

      if (response.ok) {
        html = await response.text();
        proxyUsed = 'worker';
        onProgress?.('콘텐츠 분석 중...');
      } else {
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      lastError = error;
      console.warn('Worker proxy failed:', error.message);
    }
  }

  // 2. 폴백 프록시 시도
  if (!html && CORS_CONFIG.FALLBACK_PROXIES) {
    for (const proxy of CORS_CONFIG.FALLBACK_PROXIES) {
      onProgress?.('외부 프록시 시도 중...');
      try {
        const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
        const response = await fetchWithTimeout(proxyUrl);

        if (response.ok) {
          html = await response.text();
          proxyUsed = 'fallback';
          onProgress?.('콘텐츠 분석 중...');
          break;
        }
      } catch (error) {
        lastError = error;
        console.warn(`Fallback proxy failed (${proxy}):`, error.message);
      }
    }
  }

  // 모든 프록시 실패
  if (!html) {
    throw lastError || new Error('URL 콘텐츠를 가져올 수 없습니다');
  }

  // HTML 파싱
  const result = parseHtmlContent(html);

  return {
    ...result,
    url,
    proxyUsed,
  };
}

/**
 * URL 메타데이터만 추출 (빠른 버전)
 */
export async function fetchUrlMetadata(url) {
  const result = await extractUrlContent(url);
  return {
    title: result.title,
    description: result.description,
    image: result.image,
    siteName: result.siteName,
    url: result.url,
  };
}

/**
 * 프록시 상태 확인
 */
export async function checkProxyStatus() {
  const status = {
    workerAvailable: false,
    fallbackAvailable: false,
  };

  // Worker 프록시 확인
  if (CORS_CONFIG.WORKER_PROXY) {
    try {
      const healthUrl = CORS_CONFIG.WORKER_PROXY.replace('/proxy', '/health');
      const response = await fetchWithTimeout(healthUrl, {}, 3000);
      status.workerAvailable = response.ok;
    } catch {
      status.workerAvailable = false;
    }
  }

  // 폴백 프록시 확인 (첫 번째만)
  if (CORS_CONFIG.FALLBACK_PROXIES?.[0]) {
    try {
      const testUrl = `${CORS_CONFIG.FALLBACK_PROXIES[0]}${encodeURIComponent('https://example.com')}`;
      const response = await fetchWithTimeout(testUrl, {}, 3000);
      status.fallbackAvailable = response.ok;
    } catch {
      status.fallbackAvailable = false;
    }
  }

  return status;
}

// ojt-r2-upload CORS Proxy Module
// PRD-0008: 자체 CORS 프록시 (R2 Worker 통합)

// SSRF 방지를 위한 차단 URL 패턴
const BLOCKED_URL_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/\[::1\]/,
  /^https?:\/\/169\.254\./,
  /^https?:\/\/metadata\.google/i,
  /^https?:\/\/.*\.internal/i,
];

// 허용되는 콘텐츠 타입
const ALLOWED_CONTENT_TYPES = [
  'text/html',
  'text/plain',
  'application/json',
  'application/xml',
  'text/xml',
  'application/xhtml+xml',
];

// 최대 응답 크기 (10MB)
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

// 캐시 TTL (5분)
const CACHE_TTL = 300;

/**
 * URL 유효성 검증 (SSRF 방지)
 */
function validateUrl(urlString) {
  if (!urlString) {
    return { valid: false, error: 'URL이 필요합니다' };
  }

  try {
    const url = new URL(urlString);

    // HTTPS만 허용 (보안)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { valid: false, error: 'HTTP/HTTPS URL만 허용됩니다' };
    }

    // 차단된 패턴 확인 (SSRF 방지)
    for (const pattern of BLOCKED_URL_PATTERNS) {
      if (pattern.test(urlString)) {
        return { valid: false, error: '허용되지 않는 URL입니다' };
      }
    }

    return { valid: true, url };
  } catch {
    return { valid: false, error: '유효하지 않은 URL 형식입니다' };
  }
}

/**
 * CORS 프록시 핸들러
 * GET /proxy?url=<encoded_url>
 */
export async function handleCorsProxy(request, env) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  // URL 검증
  const validation = validateUrl(targetUrl);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    // 외부 URL 페칭 (5초 타임아웃)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 응답 크기 확인
    const contentLength = parseInt(response.headers.get('Content-Length') || '0');
    if (contentLength > MAX_RESPONSE_SIZE) {
      return new Response(
        JSON.stringify({ error: '응답이 너무 큽니다 (최대 10MB)' }),
        {
          status: 413,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // 콘텐츠 타입 확인
    const contentType = response.headers.get('Content-Type') || '';
    const isAllowedType = ALLOWED_CONTENT_TYPES.some((type) => contentType.includes(type));

    if (!isAllowedType) {
      return new Response(
        JSON.stringify({
          error: `허용되지 않는 콘텐츠 타입입니다: ${contentType}`,
        }),
        {
          status: 415,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // 응답 본문 읽기
    const body = await response.text();

    // 크기 재확인
    if (body.length > MAX_RESPONSE_SIZE) {
      return new Response(
        JSON.stringify({ error: '응답이 너무 큽니다 (최대 10MB)' }),
        {
          status: 413,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // 성공 응답
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Proxy-Source': 'ojt-r2-worker',
      },
    });
  } catch (error) {
    console.error('CORS Proxy error:', error);

    const errorMessage = error.name === 'AbortError' ? '요청 시간이 초과되었습니다' : error.message;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * CORS Preflight 핸들러
 */
export function handleCorsPreflightProxy() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

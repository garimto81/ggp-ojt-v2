// ojt-r2-upload Worker
// Cloudflare R2 이미지 업로드 프록시

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:51544',
  'https://ggp-ojt-v2.vercel.app'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Key',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '',
      'Content-Type': 'application/json',
    };

    // POST: 업로드 준비 (key 생성)
    if (request.method === 'POST' && url.pathname === '/') {
      try {
        const body = await request.json();
        const { filename, contentType, fileSize } = body;

        if (!filename || !contentType) {
          return Response.json(
            { error: 'filename과 contentType은 필수입니다' },
            { status: 400, headers: corsHeaders }
          );
        }

        if (!ALLOWED_TYPES.includes(contentType)) {
          return Response.json(
            { error: '허용되지 않는 파일 형식입니다 (JPG, PNG, GIF, WebP만 지원)' },
            { status: 400, headers: corsHeaders }
          );
        }

        if (fileSize && fileSize > MAX_FILE_SIZE) {
          return Response.json(
            { error: '파일 크기는 10MB를 초과할 수 없습니다' },
            { status: 400, headers: corsHeaders }
          );
        }

        // 고유 파일명 생성
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const ext = filename.split('.').pop().toLowerCase();
        const key = `uploads/${timestamp}-${randomStr}.${ext}`;

        return Response.json({
          key: key,
          uploadUrl: `${url.origin}/upload`,
          publicUrl: `${env.R2_PUBLIC_URL}/${key}`
        }, { headers: corsHeaders });

      } catch (error) {
        console.error('POST error:', error);
        return Response.json(
          { error: error.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // PUT: 파일 업로드
    if (request.method === 'PUT' && url.pathname === '/upload') {
      try {
        const key = request.headers.get('X-Upload-Key');
        const contentType = request.headers.get('Content-Type');

        if (!key) {
          return Response.json(
            { error: 'X-Upload-Key 헤더가 필요합니다' },
            { status: 400, headers: corsHeaders }
          );
        }

        if (!key.startsWith('uploads/')) {
          return Response.json(
            { error: '잘못된 업로드 키입니다' },
            { status: 400, headers: corsHeaders }
          );
        }

        // R2에 업로드
        await env.R2_BUCKET.put(key, request.body, {
          httpMetadata: {
            contentType: contentType || 'application/octet-stream'
          }
        });

        console.log('Uploaded to R2:', key);

        return Response.json({
          success: true,
          key: key,
          url: `${env.R2_PUBLIC_URL}/${key}`
        }, { headers: corsHeaders });

      } catch (error) {
        console.error('PUT error:', error);
        return Response.json(
          { error: error.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // DELETE: 이미지 삭제
    if (request.method === 'DELETE' && url.pathname === '/') {
      try {
        const { key } = await request.json();

        if (!key) {
          return Response.json(
            { error: 'key는 필수입니다' },
            { status: 400, headers: corsHeaders }
          );
        }

        if (!key.startsWith('uploads/')) {
          return Response.json(
            { error: '잘못된 키입니다' },
            { status: 400, headers: corsHeaders }
          );
        }

        await env.R2_BUCKET.delete(key);
        console.log('Deleted from R2:', key);

        return Response.json({ success: true }, { headers: corsHeaders });

      } catch (error) {
        console.error('DELETE error:', error);
        return Response.json(
          { error: error.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // GET: 이미지 직접 서빙 (r2.dev 대신 사용 가능)
    if (request.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      try {
        const key = url.pathname.slice(1); // 앞의 / 제거
        const object = await env.R2_BUCKET.get(key);

        if (!object) {
          return Response.json(
            { error: 'Not found' },
            { status: 404, headers: corsHeaders }
          );
        }

        return new Response(object.body, {
          headers: {
            'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*',
          }
        });

      } catch (error) {
        console.error('GET error:', error);
        return Response.json(
          { error: error.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Health check
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders });
    }

    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: corsHeaders }
    );
  }
};

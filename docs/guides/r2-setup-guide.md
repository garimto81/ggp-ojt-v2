# Cloudflare R2 이미지 스토리지 설정 가이드

## 개요

OJT Master의 이미지 업로드 기능을 위한 Cloudflare R2 설정 가이드입니다.

### 아키텍처

```
┌─────────────┐     1. 업로드 요청      ┌──────────────────┐
│   Browser   │ ───────────────────────▶│ Cloudflare Worker│
│  (Quill)    │                         │  (presigned URL) │
└─────────────┘                         └──────────────────┘
      │                                          │
      │ 2. presigned URL 반환                    │
      │◀─────────────────────────────────────────┘
      │
      │ 3. PUT 직접 업로드
      ▼
┌─────────────┐
│ Cloudflare  │
│     R2      │
└─────────────┘
      │
      │ 4. Public URL 반환
      ▼
┌─────────────┐
│   Browser   │  이미지 URL을 Quill에 삽입
└─────────────┘
```

## 1단계: R2 버킷 생성

### Cloudflare Dashboard에서 설정

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 로그인
2. 좌측 메뉴에서 **R2 Object Storage** 선택
3. **Create bucket** 클릭
4. 버킷 설정:
   - **Bucket name**: `ojt-media` (또는 원하는 이름)
   - **Location**: `APAC` (아시아 태평양) 권장
5. **Create bucket** 클릭

### Public Access 설정 (r2.dev 개발용)

1. 생성된 버킷 클릭
2. **Settings** 탭 선택
3. **Public access** 섹션에서 **Allow Access** 클릭
4. r2.dev URL이 생성됨 (예: `https://pub-xxxxx.r2.dev`)

> **참고**: 프로덕션에서는 Custom Domain 사용을 권장합니다.

## 2단계: CORS 정책 설정

1. 버킷 **Settings** 탭에서 **CORS Policy** 섹션 찾기
2. **Add CORS policy** 클릭
3. JSON 탭에서 다음 정책 입력:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:51544",
      "https://ggp-ojt-v2.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length", "x-amz-*"],
    "ExposeHeaders": ["ETag", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

4. **Save** 클릭

## 3단계: API Token 생성

### R2 전용 API Token 생성

1. **R2 Object Storage** 페이지에서 **Manage R2 API Tokens** 클릭
2. **Create API token** 클릭
3. 토큰 설정:
   - **Token name**: `ojt-media-upload`
   - **Permissions**: `Object Read & Write`
   - **Specify bucket(s)**: `ojt-media` 선택
   - **TTL**: 원하는 만료 기간 설정 (또는 무제한)
4. **Create API Token** 클릭
5. 생성된 정보 저장:
   - **Access Key ID**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Secret Access Key**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Endpoint**: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

> **중요**: Secret Access Key는 한 번만 표시됩니다. 안전하게 저장하세요!

## 4단계: Cloudflare Worker 생성

### Workers 페이지에서 생성

1. Cloudflare Dashboard에서 **Workers & Pages** 선택
2. **Create application** → **Create Worker** 클릭
3. Worker 이름 설정: `ojt-r2-upload`
4. **Deploy** 클릭

### Worker 코드 작성

**Edit code** 클릭 후 다음 코드 입력:

```javascript
// ojt-r2-upload Worker
// Cloudflare R2 presigned URL 생성기

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:51544',
  'https://ggp-ojt-v2.vercel.app'
];

const BUCKET_NAME = 'ojt-media';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // CORS 헤더
    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '',
      'Content-Type': 'application/json',
    };

    // POST: presigned URL 생성
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        const { filename, contentType, fileSize } = body;

        // 유효성 검사
        if (!filename || !contentType) {
          return new Response(JSON.stringify({ error: 'filename과 contentType은 필수입니다' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        if (!ALLOWED_TYPES.includes(contentType)) {
          return new Response(JSON.stringify({ error: '허용되지 않는 파일 형식입니다' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        if (fileSize && fileSize > MAX_FILE_SIZE) {
          return new Response(JSON.stringify({ error: '파일 크기는 10MB를 초과할 수 없습니다' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        // 고유 파일명 생성
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const ext = filename.split('.').pop();
        const key = `uploads/${timestamp}-${randomStr}.${ext}`;

        // R2에 직접 업로드 (Worker 바인딩 사용)
        // presigned URL 대신 Worker를 통한 프록시 업로드로 변경

        return new Response(JSON.stringify({
          uploadUrl: `https://ojt-r2-upload.<YOUR_SUBDOMAIN>.workers.dev/upload`,
          key: key,
          publicUrl: `${env.R2_PUBLIC_URL}/${key}`
        }), {
          status: 200,
          headers: corsHeaders
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // PUT: 실제 파일 업로드 (프록시)
    if (request.method === 'PUT' && new URL(request.url).pathname === '/upload') {
      try {
        const key = request.headers.get('X-Upload-Key');
        const contentType = request.headers.get('Content-Type');

        if (!key) {
          return new Response(JSON.stringify({ error: 'X-Upload-Key 헤더가 필요합니다' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        // R2에 업로드
        await env.R2_BUCKET.put(key, request.body, {
          httpMetadata: {
            contentType: contentType
          }
        });

        return new Response(JSON.stringify({
          success: true,
          key: key,
          url: `${env.R2_PUBLIC_URL}/${key}`
        }), {
          status: 200,
          headers: corsHeaders
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // DELETE: 이미지 삭제
    if (request.method === 'DELETE') {
      try {
        const { key } = await request.json();

        if (!key) {
          return new Response(JSON.stringify({ error: 'key는 필수입니다' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        await env.R2_BUCKET.delete(key);

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: corsHeaders
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }
};
```

### Worker 환경변수 및 바인딩 설정

1. Worker의 **Settings** → **Variables** 탭
2. **Environment Variables** 추가:
   - `R2_PUBLIC_URL`: `https://pub-xxxxx.r2.dev` (본인의 r2.dev URL)

3. **R2 Bucket Bindings** 추가:
   - **Variable name**: `R2_BUCKET`
   - **R2 bucket**: `ojt-media` 선택

4. **Save and Deploy** 클릭

## 5단계: 테스트

### cURL로 테스트

```bash
# 1. 업로드 URL 요청
curl -X POST https://ojt-r2-upload.<YOUR_SUBDOMAIN>.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"filename": "test.png", "contentType": "image/png", "fileSize": 1024}'

# 2. 파일 업로드
curl -X PUT https://ojt-r2-upload.<YOUR_SUBDOMAIN>.workers.dev/upload \
  -H "Content-Type: image/png" \
  -H "X-Upload-Key: uploads/12345-abc123.png" \
  --data-binary @test.png
```

## 체크리스트

- [ ] R2 버킷 생성 완료 (`ojt-media`)
- [ ] Public Access 활성화 (r2.dev URL 확인)
- [ ] CORS 정책 설정 완료
- [ ] API Token 생성 및 저장
- [ ] Cloudflare Worker 생성 (`ojt-r2-upload`)
- [ ] Worker R2 바인딩 설정
- [ ] Worker 환경변수 설정 (`R2_PUBLIC_URL`)
- [ ] Worker 배포 및 테스트 완료

## 다음 단계

R2 설정이 완료되면, `index.html`의 Quill 에디터에 이미지 업로드 기능을 추가합니다.

## 참고 자료

- [Cloudflare R2 공식 문서](https://developers.cloudflare.com/r2/)
- [R2 CORS 설정](https://developers.cloudflare.com/r2/buckets/cors/)
- [R2 Public Buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)

# E2E Tests - Local Docker Environment

**Issue**: #114 - Test Migration for Local-Only Architecture
**Branch**: refactor/local-only

## Overview

E2E 테스트가 Vercel 프로덕션에서 로컬 Docker 환경으로 마이그레이션되었습니다.

### 변경 사항

- **baseURL**: `https://ggp-ojt-v2.vercel.app` → `http://localhost:8080` (Docker)
- **인증 방식**: Google OAuth → 이메일 인증 (ID/비밀번호 + Admin 승인)
- **AI 엔진**: Gemini API → Local AI (vLLM) 또는 WebLLM

## 환경 요구사항

### 1. Docker 환경 실행

```bash
# 1. 프론트엔드 빌드 (루트에서)
cd src-vite
npm run build

# 2. Docker 실행 (루트에서)
cd docker
docker-compose up -d

# 3. 상태 확인
docker ps | grep ojt-nginx
curl http://localhost:8080/health
```

### 2. 환경 변수 (선택 사항)

```bash
# 기본값: http://localhost:8080
export PLAYWRIGHT_BASE_URL=http://localhost:8080

# HTTPS 테스트 (self-signed cert)
export PLAYWRIGHT_BASE_URL=https://localhost:8443
```

## 테스트 실행

### 전체 테스트

```bash
# 루트에서 실행
pnpm test
```

### Headed 모드 (브라우저 화면 표시)

```bash
pnpm test:headed
```

### UI 모드 (디버깅)

```bash
pnpm test:ui
```

### 단일 테스트 파일

```bash
npx playwright test tests/e2e-homepage.spec.js
npx playwright test tests/e2e-signup.spec.js
```

### 특정 테스트 케이스

```bash
npx playwright test -g "로그인"
npx playwright test -g "회원가입"
```

## 테스트 파일 목록

| 파일 | 설명 | 인증 필요 |
|------|------|----------|
| `e2e-homepage.spec.js` | 홈페이지 기본 동작 (로그인 폼, AI 상태) | ❌ |
| `e2e-signup.spec.js` | 회원가입 플로우 (유효성 검사, API 호출) | ❌ |
| `e2e-admin-mode.spec.js` | Admin 모드 전환 기능 | ✅ Admin |
| `e2e-admin-redesign.spec.js` | Admin 대시보드 리디자인 | ✅ Admin |
| `performance.spec.js` | 성능 테스트 (페이지 로드, 리소스) | ❌ |
| `debug-console.spec.js` | 콘솔 로그 디버깅 | ❌ |
| `e2e-issue34-source-field.spec.js` | Legacy (스킵됨) | ❌ |

## 인증 테스트

### Admin 계정이 필요한 테스트

일부 테스트는 Admin 권한이 필요합니다:
- `e2e-admin-mode.spec.js`
- `e2e-admin-redesign.spec.js`

**Admin 계정 생성**:

1. 회원가입 (아이디/비밀번호)
2. Supabase Dashboard → users 테이블에서 수동으로 `status='approved'` 설정
3. 로그인 후 `role='admin'` 설정

또는 Supabase SQL Editor에서:

```sql
-- Admin 계정 수동 생성
INSERT INTO users (id, name, role, department, status)
VALUES (
  'your-auth-uid',  -- Supabase Auth의 user.id
  'Admin User',
  'admin',
  'IT',
  'approved'
);
```

### 회원가입 테스트 (`e2e-signup.spec.js`)

회원가입 테스트는 실제 Supabase 연동을 수행합니다:

```bash
npx playwright test tests/e2e-signup.spec.js
```

**주의사항**:
- 테스트마다 고유한 사용자명 생성 (timestamp 기반)
- 422 에러: 비밀번호 정책 위반 (6자 미만)
- 500 에러: RLS 정책 문제 → `database/fixes/` 참조

## 테스트 결과

### 스크린샷

테스트 실행 시 자동으로 스크린샷 저장:

```
test-results/
├── 01-page-loaded.png
├── 02-login-form.png
├── 03-ai-status.png
├── signup-01-tab-switched.png
├── ...
```

### HTML 리포트

```bash
pnpm test:report
```

브라우저에서 `playwright-report/index.html` 자동 열림

### 실패 시 비디오

실패한 테스트는 자동으로 비디오 녹화:

```
test-results/
├── video-chromium-*.webm
```

## 디버깅

### Console 로그 캡처

```bash
npx playwright test tests/debug-console.spec.js
```

모든 `[Auth]`, `[App]` 태그가 붙은 콘솔 로그 캡처

### Network 에러 모니터링

`e2e-signup.spec.js`에서 4xx, 5xx 응답 자동 캡처:

```javascript
page.on('response', response => {
  if (response.status() >= 400) {
    // 에러 로깅
  }
});
```

### Step-by-Step 디버깅

```bash
# UI 모드로 각 단계 확인
pnpm test:ui
```

## CI/CD 통합 (미래)

**현재**: 로컬 환경에서만 실행 (Docker 필요)

**향후 계획**:
- GitHub Actions에서 Docker Compose로 테스트 환경 구성
- Playwright Test 결과를 CI 아티팩트로 저장

```yaml
# .github/workflows/e2e-tests.yml (예시)
- name: Build and Start Docker
  run: |
    cd src-vite && npm run build
    cd ../docker && docker-compose up -d

- name: Run E2E Tests
  run: pnpm test

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## 문제 해결

### Docker 컨테이너가 안 뜬다

```bash
# 컨테이너 상태 확인
docker ps -a | grep ojt

# 로그 확인
docker logs ojt-nginx

# 재시작
cd docker
docker-compose down
docker-compose up -d
```

### 테스트가 타임아웃된다

```bash
# playwright.config.js에서 timeout 늘리기 (현재 30초)
navigationTimeout: 60000
```

### HTTPS 인증서 에러

`playwright.config.js`에 `ignoreHTTPSErrors: true` 이미 설정됨

### Supabase 연결 실패

```bash
# src-vite/.env 확인
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 관련 문서

- `../docker/README.md` - Docker 환경 설정
- `../docs/DOCKER_AUTH_SETUP.md` - 이메일 인증 설정 가이드
- `../database/fixes/` - RLS 정책 수정 SQL
- `../CLAUDE.md` - 프로젝트 전체 가이드

## 변경 이력

- **2025-12-08**: Local-Only 아키텍처로 마이그레이션 (#114)
  - baseURL을 `http://localhost:8080`으로 변경
  - Google OAuth → 이메일 인증으로 변경
  - 모든 테스트 파일 업데이트 완료

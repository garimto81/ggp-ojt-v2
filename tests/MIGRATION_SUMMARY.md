# Test Migration Summary - Local-Only Architecture

**Issue**: #114
**Branch**: refactor/local-only
**Date**: 2025-12-08

## 목표 달성

E2E 테스트를 Vercel 프로덕션 환경에서 로컬 Docker 환경으로 성공적으로 마이그레이션했습니다.

## 주요 변경사항

### 1. Playwright 설정 (`playwright.config.js`)

```diff
- baseURL: 'https://ggp-ojt-v2.vercel.app',  // Production
+ baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
+ ignoreHTTPSErrors: true,  // Self-signed cert 지원
```

**특징**:
- 환경변수로 baseURL 오버라이드 가능
- HTTPS 로컬 테스트 지원 (https://localhost:8443)
- Self-signed certificate 에러 무시

### 2. 테스트 파일 업데이트

#### ✅ `e2e-homepage.spec.js` (홈페이지 기본 동작)

**변경**:
- Test 2: "Google Login Button" → "Email Login Form"
  - Google OAuth 버튼 → 이메일/비밀번호 입력 필드 체크
  - 회원가입 탭 존재 확인 추가

- Test 3: "AI Status Badge"
  - Gemini API → Local AI 또는 WebLLM 상태 확인
  - 정규식 패턴: `/local ai|webllm|.../i`

#### ✅ `e2e-admin-mode.spec.js` (Admin 모드 전환)

**변경**:
- 로그인 페이지 감지: `'Google로 로그인'` → `'로그인'`
- Admin 플로우 문서화:
  - Google OAuth → 이메일 인증 + Admin 승인

#### ✅ `e2e-admin-redesign.spec.js` (Admin 대시보드)

**변경**:
- 헤더 주석: 로컬 환경 명시
- 인증 요구사항: Admin 계정 필요 안내

#### ✅ `e2e-signup.spec.js` (회원가입 플로우)

**변경**:
- 헤더 주석: Admin 승인 프로세스 설명
- 환경: Docker (http://localhost:8080)

#### ✅ `performance.spec.js` (성능 테스트)

**변경**:
- 헤더 주석: 로컬 네트워킹으로 인한 성능 차이 안내

#### ✅ `debug-console.spec.js` (콘솔 디버깅)

**변경**:
- URL: Vercel 프로덕션 → 로컬 경로 (`/`)

#### ✅ `e2e-issue34-source-field.spec.js` (Legacy)

**변경**:
- 헤더 주석: 로컬 환경 명시
- 테스트는 이미 스킵됨 (legacy validation)

### 3. 새 문서 추가

#### `tests/README.md` (신규)

**내용**:
- 환경 요구사항 (Docker 실행 방법)
- 테스트 실행 가이드 (전체/단일/UI 모드)
- 테스트 파일 목록과 인증 요구사항 표
- Admin 계정 생성 방법
- 디버깅 가이드
- 문제 해결 (Docker, Supabase, HTTPS 등)

#### `tests/MIGRATION_SUMMARY.md` (이 파일)

**내용**:
- 변경사항 요약
- 파일별 수정 내역
- 테스트 실행 검증 체크리스트

## 변경된 파일 목록

### 수정된 파일 (Tests)

```
playwright.config.js                   +8/-2   (baseURL, ignoreHTTPSErrors)
tests/e2e-homepage.spec.js             +46/-23 (Email login, Local AI)
tests/e2e-admin-mode.spec.js           +12/-6  (Email auth flow)
tests/e2e-admin-redesign.spec.js       +5/-0   (Headers)
tests/e2e-signup.spec.js               +6/-0   (Headers)
tests/performance.spec.js              +5/-0   (Headers)
tests/debug-console.spec.js            +3/-3   (URL)
tests/e2e-issue34-source-field.spec.js +5/-0   (Headers)
```

### 신규 파일

```
tests/README.md                        (종합 가이드)
tests/MIGRATION_SUMMARY.md             (이 파일)
```

## 테스트 실행 검증 체크리스트

### 사전 준비

- [ ] Docker 환경 실행 중 (`docker ps | grep ojt-nginx`)
- [ ] 프론트엔드 빌드 완료 (`src-vite/dist/` 존재)
- [ ] Nginx 헬스체크 통과 (`curl http://localhost:8080/health`)

### 테스트 실행

```bash
# 1. 전체 테스트
pnpm test

# 2. 주요 테스트 개별 실행
npx playwright test tests/e2e-homepage.spec.js    # 로그인 폼
npx playwright test tests/e2e-signup.spec.js      # 회원가입
npx playwright test tests/performance.spec.js     # 성능

# 3. UI 모드 확인
pnpm test:ui
```

### 예상 결과

**Pass**:
- `e2e-homepage.spec.js` - 로그인 폼 존재 확인
- `e2e-signup.spec.js` - 회원가입 유효성 검사 (클라이언트 측)
- `performance.spec.js` - 페이지 로드 메트릭
- `debug-console.spec.js` - 콘솔 로그 캡처

**Skip or Fail (OK)**:
- `e2e-admin-mode.spec.js` - Admin 인증 필요 (로그인 안 되어 있으면 스킵)
- `e2e-admin-redesign.spec.js` - Admin 인증 필요
- `e2e-issue34-source-field.spec.js` - 이미 스킵됨 (test.skip)

## 추가 작업 필요 (향후)

### CI/CD 통합

GitHub Actions에서 Docker 환경을 구성하여 자동 테스트:

```yaml
# .github/workflows/e2e-tests.yml
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build frontend
        run: cd src-vite && npm ci && npm run build
      - name: Start Docker
        run: cd docker && docker-compose up -d
      - name: Run tests
        run: pnpm test
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Authenticated Tests

Admin/Mentor 권한이 필요한 테스트를 위한 로그인 fixture 추가:

```javascript
// tests/fixtures/auth.fixture.js
async function loginAsAdmin(page) {
  await page.goto('/');
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/admin_dashboard/);
}
```

## 참고 문서

- `tests/README.md` - 전체 테스트 가이드
- `docker/README.md` - Docker 환경 설정
- `docs/DOCKER_AUTH_SETUP.md` - 이메일 인증 설정
- `CLAUDE.md` - 프로젝트 개요

## 완료 확인

- [x] playwright.config.js baseURL 변경
- [x] 모든 테스트 파일 로컬 환경 대응
- [x] Google OAuth → 이메일 인증 업데이트
- [x] 테스트 문서화 완료
- [x] Git 변경사항 검증 완료

**Status**: ✅ Ready for commit and PR

## 커밋 메시지 (권장)

```bash
git add playwright.config.js tests/

git commit -m "refactor(test): E2E 테스트를 로컬 Docker 환경으로 마이그레이션 (#114)

- playwright.config.js: baseURL을 http://localhost:8080으로 변경
- e2e-homepage.spec.js: Google OAuth → 이메일 로그인 폼 체크
- e2e-admin-*.spec.js: 로컬 인증 플로우로 업데이트
- 모든 테스트 파일: 로컬 환경 헤더 주석 추가
- tests/README.md: 종합 테스트 가이드 추가
- Vercel 의존성 완전 제거, Docker 기반 로컬 테스트 지원

Closes #114"
```

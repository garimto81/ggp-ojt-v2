# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJT Master - AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템 (v2.5.0)

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19 + Vite 7 (권장) / React 18 CDN (레거시) |
| **Backend/DB** | Supabase (PostgreSQL + Auth + RLS) |
| **Local Cache** | Dexie.js (IndexedDB) |
| **AI** | Google Gemini API (gemini-2.0-flash-exp) |
| **Image Storage** | Cloudflare R2 (Worker 프록시) |
| **Editor** | Quill 2.0 (Rich Text) |
| **Hosting** | Vercel (자동 배포) |

## Commands

```bash
# === Vite 앱 (src-vite/) - 권장 ===
cd src-vite
npm run dev                     # 개발 서버 (http://localhost:5173)
npm run build                   # 프로덕션 빌드
npm run lint                    # ESLint 검사
npm run lint:fix                # ESLint 자동 수정
npm run format                  # Prettier 포맷팅
npm run test                    # Vitest 단위 테스트 (watch)
npm run test:run                # 단위 테스트 1회 실행
npm run test:coverage           # 커버리지 리포트

# === 레거시 앱 (루트 index.html) ===
npx serve . -p 3000             # 로컬 개발 서버

# === E2E 테스트 (Playwright) ===
npm test                        # 전체 테스트
npm run test:headed             # 브라우저 화면 표시
npm run test:ui                 # Playwright UI 모드
npx playwright test tests/e2e-homepage.spec.js  # 단일 파일

# === R2 Worker (ojt-r2-upload/) ===
cd ojt-r2-upload
npm run dev                     # 로컬 개발 (wrangler)
npm run deploy                  # Cloudflare 배포
npm test                        # Vitest 테스트
```

## Environment Variables

```bash
# src-vite/.env (복사: .env.example → .env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_R2_WORKER_URL=https://ojt-r2-upload.your-worker.workers.dev
```

## Architecture

두 가지 프론트엔드 구조 공존:

```text
ggp_ojt_v2/
├── index.html              # 레거시 단일 파일 SPA (CDN React)
├── src-vite/               # 모던 Vite 앱 (권장)
│   ├── src/
│   │   ├── components/     # React 컴포넌트
│   │   ├── hooks/          # 커스텀 훅 (useAuth, useDocuments 등)
│   │   ├── services/       # Supabase, Gemini API 래퍼
│   │   └── utils/          # 유틸리티 함수
│   └── .env                # 환경 변수
├── ojt-r2-upload/          # Cloudflare R2 Worker
└── tests/                  # Playwright E2E 테스트
```

### 핵심 기능 모듈

| 모듈 | 설명 |
|------|------|
| **Auth** | Supabase Google OAuth + 역할 기반 접근 제어 |
| **AI Generation** | Gemini API로 OJT 콘텐츠 + 퀴즈 자동 생성 |
| **URL Context** | Gemini URL Context Tool로 URL/PDF 직접 분석 (v2.4.0) |
| **Original Viewer** | URL/PDF 원문 뷰어 - PDF.js 기반 (v2.4.0) |
| **Offline Sync** | Dexie.js 캐시 + 오프라인 큐 자동 동기화 |
| **File Upload** | Cloudflare R2 Worker 통한 이미지/PDF 저장 |

## Data Structure

### Supabase (PostgreSQL)

```sql
-- users: 사용자 프로필
users (id UUID PK, name, role, department, created_at, updated_at)

-- ojt_docs: OJT 문서
ojt_docs (id UUID PK, title, team, step, sections JSONB, quiz JSONB, author_id, author_name, estimated_minutes, source_type, source_url, source_file, created_at, updated_at)

-- learning_records: 학습 기록
learning_records (id UUID PK, user_id, doc_id, score, total_questions, passed, completed_at)
```

RLS 정책: `supabase_schema.sql`, `supabase_fix_rls.sql` 참조

### 확장 스키마

```sql
-- learning_progress: 학습 진행률 추적 ✅ Phase 2 완료
learning_progress (id UUID PK, user_id FK, doc_id FK, status, current_section, total_time_seconds, quiz_attempts, best_score)

-- teams: 팀 마스터 ✅ Phase 3 완료
teams (id UUID PK, name, slug, display_order, is_active)
-- ojt_docs.team_id FK 추가됨

-- v2.4.0: 원문 소스 컬럼 (source_type, source_url, source_file)
-- 마이그레이션: supabase_source_columns.sql 참조
```

자세한 마이그레이션 가이드: [docs/DB_MIGRATION_GUIDE.md](docs/DB_MIGRATION_GUIDE.md)

### Dexie.js (로컬 캐시)

```javascript
localDb.version(1).stores({
  users: 'id, name, role',
  ojt_docs: 'id, team, step, author_id, updated_at',
  learning_records: 'id, user_id, doc_id',
  sync_queue: '++id, table, action, created_at'
});
```

## Role-Based Access

| 역할 | 권한 |
|------|------|
| **Admin** | 전체 사용자/콘텐츠 관리, 역할 변경, 통계 대시보드, Mentor 모드 전환 |
| **Mentor** | 비정형 텍스트 → AI 변환 → Supabase 저장, 자료 CRUD |
| **Mentee** | 팀별 로드맵 탐색 → 문서 학습 → 퀴즈 평가 (읽기 전용) |

**Admin 모드 전환**: Header의 "모드" 버튼으로 Mentor 작업실 전환 가능. `sessionStorage`로 세션 유지.

## Sync Strategy (Online-First, Offline-Ready)

| 작업 | 흐름 |
|------|------|
| **READ** | Dexie 캐시 → (온라인) Supabase 동기화 |
| **WRITE** | Dexie 저장 → (온라인) Supabase / (오프라인) 큐잉 |
| **DELETE** | Dexie 삭제 → (온라인) Supabase / (오프라인) 큐잉 |

오프라인 큐는 `window.addEventListener('online')` 이벤트로 자동 처리

## Error Handling

### 에러 복구 전략

| 영역 | 전략 | 설명 |
|------|------|------|
| **Gemini API 응답** | Regex fallback | JSON 파싱 실패 시 정규식으로 필드 추출 |
| **퀴즈 부족** | 더미 생성 | 20개 미만 시 자동 채움 |
| **CORS 차단** | 다중 프록시 | allorigins.win, corsproxy.io 순차 시도 |
| **오프라인 동기화** | 재시도 + 폐기 | 3회 실패 시 큐에서 제거 |

### 사용자 피드백

- `alert()`: 로그인 오류, 저장 오류, 생성 오류
- `console.error()`: 상세 디버그 로그

## AI Content Generation

Google Gemini API를 사용한 클라우드 기반 AI 콘텐츠 생성:

### 기존 방식 (직접 작성/텍스트 입력)
- 프롬프트: 10년 경력 기업 교육 설계 전문가 역할
- 섹션 구조: 학습 목표 → 핵심 내용 → 실무 예시 → 주의사항
- 퀴즈: 기억형 40% / 이해형 35% / 적용형 25%
- 파라미터: temperature=0.3, maxOutputTokens=8192

### v2.4.0: URL Context Tool (URL/PDF 입력)
- Gemini URL Context Tool로 URL/PDF 직접 분석
- 원문 보존 + 퀴즈만 자동 생성
- CORS 프록시 불필요 (Gemini가 직접 접근)
- `tools: [{ urlContext: {} }]` 옵션 사용

## CORS Proxies

URL 콘텐츠 추출 시 사용하는 프록시 목록 (순차 시도):
1. `https://api.allorigins.win/raw?url=`
2. `https://corsproxy.io/?`

**제한사항**:
- 최대 추출 문자: 15,000자
- 일부 사이트는 차단될 수 있음

## Deployment

| 환경 | URL | AI 기능 |
|------|-----|---------|
| **Production** | https://ggp-ojt-v2.vercel.app | Gemini API 사용 가능 |
| **Local** | http://localhost:3000 | Gemini API 사용 가능 |

- **Branch**: main (Vercel 자동 배포)
- **Supabase Auth**: Google OAuth
- **AI**: Google Gemini API (무료 티어)

> **중요**: 이 프로젝트는 Vercel에 연동되어 있어 main 브랜치 push 시 자동 배포됩니다.

### 코드 수정 후 필수 작업

1. **버전 업데이트**: `index.html`, `package.json`, `src-vite/package.json` 동시 수정
2. **버전 규칙**: MAJOR.MINOR.PATCH (버그=PATCH↑, 기능=MINOR↑, 큰변경=MAJOR↑)
3. **main 브랜치 push 시 Vercel 자동 배포**

## Project Structure

```text
ggp_ojt_v2/
├── index.html                    # 전체 앱 (단일 파일 SPA)
├── supabase_*.sql                # DB 스키마 및 마이그레이션 파일들
├── playwright.config.js          # E2E 테스트 설정
├── docs/
│   ├── DB_MIGRATION_GUIDE.md     # DB 마이그레이션 가이드
│   └── r2-setup-guide.md         # R2 설정 가이드
├── tests/
│   ├── e2e-homepage.spec.js      # 홈페이지 E2E 테스트
│   └── e2e-admin-mode.spec.js    # Admin 모드 E2E 테스트
└── ojt-r2-upload/                # Cloudflare R2 Worker 프로젝트
    ├── src/index.js              # Worker 핸들러 (upload/delete/get)
    └── wrangler.jsonc            # Cloudflare 설정
```

## Known Issues

> 상세 내용: `TODO.md`, `CODE_REVIEW_*.md`, `PERFORMANCE_ANALYSIS.md` 참조

### 작업 시 주의사항

1. **API 키**: 레거시 `index.html`에 노출됨. Vite 앱에서는 `.env` 사용
2. **XSS**: 사용자 HTML 입력 시 DOMPurify 필수 (Vite 앱에 포함됨)
3. **퀴즈 로직**: 정답 인덱스 0 처리 주의 (`=== 0` 대신 `hasOwnProperty` 사용)
4. **버전 동기화**: 수정 후 `index.html`, `package.json`, `src-vite/package.json` 버전 일치 필수
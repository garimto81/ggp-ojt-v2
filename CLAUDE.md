# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJT Master - AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템 (v2.6.8)

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

# 단위 테스트 (Vitest)
npm run test                    # Watch 모드
npm run test:run                # 1회 실행
npm run test:coverage           # 커버리지 리포트
npm run format:check            # 포맷 검사 (수정 없이)
npx vitest run src/utils/api.test.js              # 단일 파일
npx vitest run -t "checkAIStatus"                 # 특정 테스트명 매칭

# === 레거시 앱 (루트 index.html) ===
npx serve . -p 3000             # 로컬 개발 서버

# === E2E 테스트 (Playwright) - 루트에서 실행 ===
# 기본 baseURL: https://ggp-ojt-v2.vercel.app (프로덕션)
# 로컬 테스트: playwright.config.js에서 baseURL 주석 전환
npm test                        # 전체 테스트
npm run test:headed             # 브라우저 화면 표시
npm run test:ui                 # Playwright UI 모드
npm run test:report             # HTML 리포트 열기
npx playwright test tests/e2e-homepage.spec.js   # 단일 파일
npx playwright test -g "로그인"                   # 테스트명 매칭

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

### 프로젝트 구조

```
ggp_ojt_v2/
├── index.html              # 레거시 단일 파일 SPA (CDN React)
├── src-vite/               # 모던 Vite 앱 (권장)
│   └── src/
│       ├── components/     # React 컴포넌트
│       ├── contexts/       # React Context (Auth, Docs, Toast)
│       ├── utils/          # API, DB, Helpers
│       └── constants.js    # 설정값
├── ojt-r2-upload/          # Cloudflare R2 Worker
├── database/               # SQL 스키마 및 마이그레이션
│   ├── migrations/         # 스키마 생성/변경 SQL
│   └── fixes/              # RLS/성능 수정 SQL
├── tests/                  # Playwright E2E 테스트
│   ├── e2e-*.spec.js       # E2E 테스트 파일
│   └── performance.spec.js # 성능 테스트
└── docs/                   # 가이드 문서
```

### Context API 패턴 (src-vite)

```
App.jsx
  └── AuthProvider (contexts/AuthContext.jsx)
        ├── user, viewState, sessionMode 상태 관리
        ├── handleGoogleLogin, handleLogout, handleRoleSelect
        └── handleModeSwitch (Admin → Mentor 모드 전환)

  └── DocsProvider (contexts/DocsContext.jsx)
        ├── docs, selectedDoc 상태 관리
        └── CRUD 작업 (fetchDocs, saveDoc, deleteDoc)

  └── ToastProvider (contexts/ToastContext.jsx)
        └── react-hot-toast 래퍼
```

### 데이터 흐름

```
[사용자 액션]
     │
     ▼
[React Component] ──→ [Context Hook] ──→ [utils/api.js]
     │                    │                    │
     │                    │                    ▼
     │                    │            [Gemini API / Supabase]
     │                    │                    │
     │                    ▼                    │
     │              [utils/db.js] ◄────────────┘
     │                    │
     │                    ▼
     │              [Dexie.js 캐시]
     │                    │
     ▼                    ▼
[UI 업데이트] ◄──── [상태 변경]
```

### Sync Strategy (Online-First, Offline-Ready)

| 작업 | 흐름 |
|------|------|
| **READ** | Dexie 캐시 → (온라인) Supabase 동기화 |
| **WRITE** | Dexie 저장 → (온라인) Supabase / (오프라인) sync_queue |
| **DELETE** | Dexie 삭제 → (온라인) Supabase / (오프라인) sync_queue |

오프라인 큐는 `window.addEventListener('online')` 이벤트로 자동 처리

## Data Structure

### Supabase (PostgreSQL)

```sql
-- users: 사용자 프로필
users (id UUID PK, name, role, department, created_at, updated_at)

-- ojt_docs: OJT 문서
ojt_docs (id UUID PK, title, team, team_id FK, step, sections JSONB, quiz JSONB,
          author_id, author_name, estimated_minutes, source_type, source_url,
          source_file, created_at, updated_at)

-- learning_records: 학습 기록
learning_records (id UUID PK, user_id, doc_id, score, total_questions, passed, completed_at)

-- learning_progress: 학습 진행률
learning_progress (id UUID PK, user_id FK, doc_id FK, status, current_section,
                   total_time_seconds, quiz_attempts, best_score)

-- teams: 팀 마스터
teams (id UUID PK, name, slug, display_order, is_active)
```

RLS 정책: `database/migrations/supabase_schema.sql`, `database/fixes/supabase_fix_rls.sql` 참조

### Dexie.js (로컬 캐시)

```javascript
localDb.version(2).stores({
  users: 'id, name, role, department',
  ojt_docs: 'id, team, step, author_id, updated_at, [team+step], [author_id+updated_at]',
  learning_records: 'id, user_id, doc_id, completed_at, [user_id+doc_id], [user_id+completed_at]',
  sync_queue: '++id, table, action, created_at'
});
```

## Role-Based Access

| 역할 | 권한 | viewState |
|------|------|-----------|
| **Admin** | 전체 관리, Mentor 모드 전환 | `admin_dashboard` |
| **Mentor** | AI 콘텐츠 생성, 자료 CRUD | `mentor_dashboard` |
| **Mentee** | 로드맵 탐색, 학습, 퀴즈 (읽기 전용) | `mentee_list` → `mentee_study` |

**Admin 모드 전환**: Header "모드" 버튼 → `sessionStorage`로 세션 유지

## AI Content Generation

### Gemini API 설정

- Model: `gemini-2.0-flash-exp`
- Temperature: 0.3
- Max tokens: 8192
- 프롬프트: 10년 경력 기업 교육 설계 전문가 역할

### 콘텐츠 생성 방식

| 입력 방식 | 처리 |
|-----------|------|
| 직접 작성/텍스트 | 섹션 구조화 + 퀴즈 20개 생성 |
| URL/PDF (v2.4.0) | Gemini URL Context Tool로 직접 분석, 원문 보존 |

### 퀴즈 구성

- 기억형 40%: 핵심 용어, 정의
- 이해형 35%: 개념 관계, 비교
- 적용형 25%: 실무 상황 판단
- 20개 미만 시 더미 자동 생성

## Error Handling

| 영역 | 전략 |
|------|------|
| Gemini JSON 파싱 실패 | Regex fallback으로 필드 추출 |
| 퀴즈 부족 | `createPlaceholderQuiz()`로 자동 채움 |
| CORS 차단 | `allorigins.win` → `corsproxy.io` 순차 시도 |
| 오프라인 동기화 | 3회 실패 시 큐에서 제거 |
| Supabase 타임아웃 | 10초 후 로컬 캐시 반환 |

## Deployment

- **Production**: https://ggp-ojt-v2.vercel.app
- **Branch**: main (Vercel 자동 배포)
- **Auth**: Supabase Google OAuth

### 코드 수정 후 필수 작업

1. **버전 업데이트**: `index.html`, `package.json`, `src-vite/package.json`, `CLAUDE.md` 동시 수정
2. **커밋 해시 업데이트**: `index.html` 로그인 페이지에 버전 + 커밋 해시 표시
   - 위치: `<p className="text-xs text-slate-400 mt-1">v2.6.8 (<hash>) | ...`
3. **버전 규칙**: MAJOR.MINOR.PATCH (버그=PATCH, 기능=MINOR, 큰변경=MAJOR)

```bash
# 최신 커밋 해시 확인
git log -1 --format='%h'
```

## 작업 시 주의사항

1. **API 키**: 레거시 `index.html`에 노출됨 → Vite 앱에서는 `.env` 사용
2. **XSS**: 사용자 HTML 입력 시 DOMPurify 필수 (Vite 앱에 포함)
3. **퀴즈 정답 인덱스**: 0 처리 주의 (`=== 0` 대신 `hasOwnProperty` 사용)
4. **버전 동기화**: 수정 후 4개 파일 버전 + 커밋 해시 일치 필수
5. **SSRF 방어**: `validateUrlForSSRF()` - localhost, 내부 IP 차단됨

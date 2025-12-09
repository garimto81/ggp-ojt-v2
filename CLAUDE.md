# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJT Master - AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템 (v2.13.6)

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19 + Vite 7 + Tailwind CSS 4 |
| **State** | React Query (TanStack Query v5) |
| **Backend/DB** | Supabase (PostgreSQL + Auth + RLS) |
| **Local Cache** | Dexie.js (IndexedDB) |
| **AI** | Local AI (vLLM) + WebLLM fallback (Issue #101) |
| **Charts** | Chart.js + react-chartjs-2 |
| **Image Storage** | Cloudflare R2 (Worker 프록시) |
| **Editor** | Quill 2.0 (Rich Text) |
| **PDF** | pdfjs-dist (PDF 텍스트 추출) |
| **Hosting** | Vercel (자동 배포) |

## Commands

**Workspace**: `pnpm-workspace.yaml` (루트) → `src-vite/`, `ojt-r2-upload/`

| 테스트 종류 | 위치 | 실행 |
|-------------|------|------|
| Unit (Vitest) | `src-vite/src/**/*.test.{js,jsx}` | `pnpm test:vite` |
| E2E (Playwright) | `tests/*.spec.js` | `pnpm test` |
| R2 Worker | `ojt-r2-upload/` | `pnpm test:worker` |

```bash
# === 루트에서 실행 (pnpm workspace) ===
pnpm dev                        # 개발 서버 (http://localhost:5173)
pnpm build                      # 프로덕션 빌드
pnpm lint                       # ESLint 검사
pnpm test:vite                  # Vitest 단위 테스트 (1회 실행)
pnpm test:worker                # R2 Worker 테스트

# === Vite 앱 상세 (src-vite/) ===
cd src-vite
npm run dev                     # 개발 서버
npm run lint:fix                # ESLint 자동 수정
npm run format                  # Prettier 포맷팅
npm run format:check            # 포맷 검사 (수정 없이)

# 단위 테스트 (Vitest) - src-vite/src/**/*.test.{js,jsx}
# 환경: jsdom, Setup: src/test/setup.js
npm run test                    # Watch 모드
npm run test:run                # 1회 실행
npm run test:coverage           # 커버리지 리포트 (v8 provider)
npx vitest run src/utils/api.test.js              # 단일 파일
npx vitest run -t "checkAIStatus"                 # 특정 테스트명 매칭

# === E2E 테스트 (Playwright) - 루트에서 실행 ===
# 테스트 파일 위치: 루트/tests/*.spec.js (6개)
# 기본 baseURL: https://ggp-ojt-v2.vercel.app (프로덕션)
# 로컬 테스트: playwright.config.js 17행 주석 해제, 16행 주석 처리
pnpm test                       # 전체 테스트
pnpm test:headed                # 브라우저 화면 표시
pnpm test:ui                    # Playwright UI 모드
pnpm test:report                # HTML 리포트 열기
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
VITE_R2_WORKER_URL=https://ojt-r2-upload.your-worker.workers.dev

# Local AI (vLLM) - 선택 사항 (Issue #101)
VITE_LOCAL_AI_URL=http://your-vllm-server:8000  # 미설정 시 WebLLM fallback
```

## Path Aliases

vite.config.js에 정의된 import alias:

| Alias | 경로 |
|-------|------|
| `@` | `src/` |
| `@features` | `src/features/` |
| `@utils` | `src/utils/` |
| `@contexts` | `src/contexts/` |
| `@hooks` | `src/hooks/` |
| `@layouts` | `src/layouts/` |
| `@components` | `src/components/` |

```javascript
// 사용 예시
import { useAuth } from '@features/auth/hooks/AuthContext';
import { CONFIG } from '@/constants';
```

## Architecture

### 프로젝트 구조 (Feature-Based)

```
ggp_ojt_v2/
├── src-vite/                    # Vite 앱 (프로덕션)
│   └── src/
│       ├── features/            # Feature-Based 모듈 (핵심)
│       │   ├── admin/           # 관리자 기능
│       │   │   ├── components/  # AdminDashboard, AnalyticsCharts
│       │   │   ├── hooks/       # useAnalytics, useUsers
│       │   │   └── services/    # analyticsService
│       │   ├── ai/              # AI 콘텐츠 생성
│       │   │   ├── components/  # AIEngineSelector
│       │   │   ├── hooks/       # AIContext (Local AI + WebLLM 상태 관리)
│       │   │   └── services/    # localAI, webllm, contentGenerator, quizValidator
│       │   ├── auth/            # 인증
│       │   │   ├── components/  # RoleSelectionPage
│       │   │   └── hooks/       # AuthContext
│       │   ├── docs/            # 문서 관리
│       │   │   ├── components/  # MentorDashboard, PdfViewer, SplitViewLayout
│       │   │   ├── hooks/       # useDocs (React Query)
│       │   │   └── services/    # urlExtractor
│       │   └── learning/        # 학습 기능
│       │       ├── components/  # MenteeList, MenteeStudy
│       │       └── hooks/       # useLearningRecords
│       ├── contexts/            # 공유 Context (Toast, Docs)
│       ├── layouts/             # 레이아웃 (Header)
│       ├── utils/               # 유틸리티 (api, db, helpers, security)
│       └── constants.js         # 설정값
├── ojt-r2-upload/               # Cloudflare R2 Worker
├── database/                    # SQL 스키마 및 마이그레이션
├── tests/                       # Playwright E2E 테스트
├── vercel.json                  # Vercel 배포 설정
└── docs/                        # 가이드 문서
```

### Provider 계층 구조

```jsx
// main.jsx - Provider 중첩 순서
<QueryClientProvider>      // React Query (staleTime: 5분, gcTime: 10분)
  <ToastProvider>          // Toast 알림
    <AuthProvider>         // 인증 상태 (features/auth/hooks/)
      <AIProvider>         // AI 상태 - Local AI + WebLLM (features/ai/hooks/)
        <DocsProvider>     // 문서 상태 (contexts/)
          <App />
        </DocsProvider>
      </AIProvider>
    </AuthProvider>
  </ToastProvider>
</QueryClientProvider>
```

### React Query 패턴

```javascript
// features/docs/hooks/useDocs.js - Query Keys Factory
export const docsKeys = {
  all: ['docs'],
  lists: () => [...docsKeys.all, 'list'],
  list: (filters) => [...docsKeys.lists(), filters],
  detail: (id) => [...docsKeys.all, 'detail', id],
  myDocs: (userId) => [...docsKeys.all, 'my', userId],
};

// 사용 예시
const { data: docs } = useQuery({
  queryKey: docsKeys.list({ team }),
  queryFn: () => fetchDocs({ team }),
});
```

### 데이터 흐름

```
[사용자 액션]
     │
     ▼
[React Component] ──→ [React Query Hook] ──→ [Supabase API]
     │                       │                     │
     │                       ▼                     │
     │              [QueryClient Cache] ◄──────────┘
     │                       │
     │                       ▼
     │              [Dexie.js 로컬 캐시]
     │                       │
     ▼                       ▼
[UI 업데이트] ◄──────── [상태 변경]
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

RLS 정책: `database/fixes/rls_complete_redesign.sql` **(권장 - Issue #112)**

### Database Migrations

마이그레이션 파일은 `database/` 디렉토리에 위치:

```
database/
├── migrations/                         # 스키마 마이그레이션 (순서대로 적용)
│   ├── supabase_schema.sql             # 1. 기본 스키마 (users, ojt_docs, learning_records)
│   ├── supabase_phase2_learning_progress.sql  # 2. learning_progress 테이블
│   ├── supabase_phase3_teams.sql       # 3. teams 테이블
│   ├── supabase_source_columns.sql     # 4. source_type/url/file 컬럼
│   ├── 20251207_admin_page_redesign.sql # 5. Admin 리디자인 관련
│   └── 20251208_email_auth.sql         # 6. Email 인증 컬럼 추가
└── fixes/                              # RLS 및 성능 수정
    ├── rls_complete_redesign.sql       # ⭐⭐ RLS 완전 재설계 (최신, Issue #112)
    ├── supabase_complete_permissions.sql # 전체 권한 설정 (구버전)
    ├── VERIFICATION_CHECKLIST.md       # 권한 검증 체크리스트
    ├── check_admin_rls.sql             # 권한 검증 쿼리
    ├── fix_issue_109_infinite_recursion.sql # RLS 무한 재귀 수정
    └── fix_signup_rls.sql              # 회원가입 RLS 수정
```

**적용 방법**: Supabase Dashboard → SQL Editor에서 `rls_complete_redesign.sql` 실행

### Supabase 권한 체계 (중요!)

PostgreSQL 접근 제어는 2단계로 동작:

```
GRANT (테이블 레벨) → RLS (행 레벨)
```

**핵심**: GRANT 없으면 RLS 검사 전에 "permission denied" 발생!

### RLS 설계 원칙 (Issue #112)

| 원칙 | 설명 |
|------|------|
| **SECURITY DEFINER 함수** | 역할 확인 시 RLS 우회 필수 (`rls_is_admin()`) |
| **자기 참조 금지** | `users` 정책에서 `users` 직접 조회 → 무한 재귀 |
| **신규 사용자 예외** | INSERT는 `auth.uid() = id`만 체크 (users 테이블에 아직 없음) |

### RLS 함수 (SECURITY DEFINER)

```sql
rls_is_admin()         -- Admin 여부 확인
rls_is_mentor_or_admin() -- Mentor/Admin 여부 확인
rls_get_my_role()      -- 현재 사용자 역할 조회
```

### 테이블별 RLS 정책

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| **users** | 본인 OR Admin | 본인만 | 본인 OR Admin | - |
| **ojt_docs** | 모두 | Mentor/Admin | 작성자 OR Admin | 작성자 OR Admin |
| **learning_records** | 본인 OR Admin | 본인만 | 본인만 | - |
| **learning_progress** | 본인 OR Admin | 본인만 | 본인만 | - |
| **teams** | 모두 | - | - | - |

**403/500 에러 발생 시**: `database/fixes/rls_complete_redesign.sql` 실행

### Dexie.js (로컬 캐시)

```javascript
localDb.version(2).stores({
  users: 'id, name, role, department',
  ojt_docs: 'id, team, step, author_id, updated_at, [team+step], [author_id+updated_at]',
  learning_records: 'id, user_id, doc_id, completed_at, [user_id+doc_id], [user_id+completed_at]',
  sync_queue: '++id, table, action, created_at, retries'
});
```

## Role-Based Access

| 역할 | 권한 | viewState |
|------|------|-----------|
| **Admin** | 전체 관리, Mentor 모드 전환, 사용자 승인 | `admin_dashboard` |
| **Mentor** | AI 콘텐츠 생성, 자료 CRUD | `mentor_dashboard` |
| **Mentee** | 로드맵 탐색, 학습, 퀴즈 (읽기 전용) | `mentee_list` → `mentee_study` |

**Admin 모드 전환**: Header "모드" 버튼 → `sessionStorage`로 세션 유지

## Authentication (Issue #105, #107)

### 환경별 인증 모드

| 환경 | VITE_AUTH_MODE | 인증 방식 |
|------|----------------|----------|
| **Vercel** | `google` (기본) | Google OAuth |
| **Docker** | `email` (기본) | 아이디/비밀번호 + 관리자 승인 |
| **하이브리드** | `hybrid` | 둘 다 지원 |

### Docker 사내 배포 인증 흐름

```
회원가입 (아이디/비밀번호) → status='pending' → Admin 승인 → status='approved' → 로그인 가능
```

- **아이디**: 내부적으로 `@local` 접미사 추가 (예: `hong` → `hong@local`)
- **관리자 승인**: Admin Dashboard > "승인 관리" 탭
- **Supabase 설정**: Authentication > Providers > Email > "Confirm email" OFF

### 관련 파일

- `src-vite/src/features/auth/components/AuthLoginPage.jsx` - 로그인/회원가입 UI
- `src-vite/src/features/auth/components/PendingApprovalPage.jsx` - 승인 대기 화면
- `src-vite/src/features/admin/components/UserApprovalTab.jsx` - Admin 승인 관리
- `database/migrations/20251208_email_auth.sql` - DB 스키마
- `docs/DOCKER_AUTH_SETUP.md` - 상세 가이드

## AI Content Generation (Local AI + WebLLM)

### 엔진 우선순위 (Issue #101)

1. **Local AI (vLLM)** - 사내 AI 서버 최우선 (OpenAI-compatible API)
2. **WebLLM** - Local AI 미사용 시 브라우저 fallback

### Local AI 설정 (최우선, Issue #101)

- **Model**: Qwen/Qwen3-4B (vLLM 서버 기본값)
- **Temperature**: 0.3
- **Max tokens**: 4096
- **Timeout**: 60초
- **요구사항**: `VITE_LOCAL_AI_URL` 환경변수 설정
- **상태 흐름**: `NOT_CONFIGURED` → `CHECKING` → `AVAILABLE` / `UNAVAILABLE`

### WebLLM 설정 (fallback)

- **Default Model**: Qwen 2.5 3B (한국어 우수, 2.4GB)
- **Fallback Model**: Gemma 2 2B (저사양용, 1.8GB)
- **Temperature**: 0.3
- **Max tokens**: 4096
- **요구사항**: WebGPU 지원 브라우저

### AI Context 상태 (`AIContext.jsx`)

```javascript
// 상태 상수 (AI_STATUS)
CHECKING          // 초기 상태 확인 중
LOCAL_AI_CHECKING // Local AI 연결 확인 중
LOCAL_AI_READY    // Local AI 사용 가능
LOCAL_AI_FAILED   // Local AI 실패 → WebLLM fallback
WEBLLM_READY      // WebLLM 사용 가능
WEBLLM_LOADING    // WebLLM 모델 로딩 중
NO_ENGINE         // 사용 가능한 엔진 없음
```

### 콘텐츠 생성 방식

| 입력 방식 | 처리 |
|-----------|------|
| 직접 작성/텍스트 | 섹션 구조화 + 퀴즈 10개 생성 |
| URL | CORS 프록시로 텍스트 추출 후 분석 |
| PDF 파일 | pdfjs-dist로 텍스트 추출 → 섹션화 + 퀴즈 생성 |

### 퀴즈 구성

- 기억형 40%: 핵심 용어, 정의
- 이해형 35%: 개념 관계, 비교
- 적용형 25%: 실무 상황 판단
- 10개 미만 시 더미 자동 생성

### AI 장점

- **Local AI**: 사내 데이터 보안, 빠른 응답, 서버 GPU 활용
- **WebLLM**: API 비용 없음, 오프라인 가능 (첫 다운로드 후)

## Error Handling

| 영역 | 전략 |
|------|------|
| Local AI 연결 실패 | WebLLM fallback 자동 시도, 둘 다 실패 시 안내 표시 |
| AI JSON 파싱 실패 | Regex fallback으로 필드 추출 |
| 퀴즈 부족 | `createPlaceholderQuiz()`로 자동 채움 |
| CORS 차단 | `allorigins.win` → `corsproxy.io` 순차 시도 |
| 오프라인 동기화 | 3회 실패 시 큐에서 제거 |
| Supabase 타임아웃 | 10초 후 로컬 캐시 반환 |

## Deployment

- **Production**: https://ggp-ojt-v2.vercel.app
- **Build**: `src-vite/` → `dist/` (vercel.json 설정)
- **Branch**: main (Vercel 자동 배포)
- **Auth**: Supabase Google OAuth

### Vercel 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_R2_WORKER_URL` (선택)

### 버전 업데이트 규칙

1. **Single Source of Truth**: `src-vite/src/version.js` (UI 표시용 중앙 버전)
2. **동기화 필요 파일**:
   - `src-vite/src/version.js` (핵심 - APP_VERSION 상수)
   - `package.json`, `src-vite/package.json`
   - `CLAUDE.md` (Project Overview)
3. **버전 규칙**: MAJOR.MINOR.PATCH (버그=PATCH, 기능=MINOR, 큰변경=MAJOR)

```bash
# 최신 커밋 해시 확인
git log -1 --format='%h'
```

## Technical Debt

| 영역 | 문제 | 심각도 |
|------|------|--------|
| 테스트 | Context/컴포넌트 테스트 부족 (~10% 커버리지) | MEDIUM |

> **Note**: api.js는 re-export hub로 리팩토링 완료됨 (실제 로직은 features/*/services/에 분리)
>
> **마스터 플랜**: `tasks/prds/refactoring-master-plan.md` 참조

## Docker 사내 배포 (현재 운영)

### 서버 주소

| 서비스 | URL | 설명 |
|--------|-----|------|
| **Frontend** | https://localhost:8443 | nginx (자체 서명 인증서) |
| **Backend API** | http://localhost:3000 | ojt-master 컨테이너 |
| **Local AI** | http://10.10.100.209:8001 | vLLM 서버 (Qwen3-4B) |

### 컨테이너 상태 확인

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Local AI API 테스트

```bash
curl http://10.10.100.209:8001/health
curl http://10.10.100.209:8001/v1/models
```

## Known Issues (2025-12-09)

### 활성 이슈

| # | 제목 | 우선순위 | 상태 |
|---|------|----------|------|
| #117 | 문서 저장 후 검토 대기 목록에 표시되지 않음 | HIGH | 디버깅 중 |
| #116 | LLM 콘텐츠 구조화 미작동 | HIGH | 조사 필요 |
| #114 | Local-Only 아키텍처 전환 (PR #115) | MEDIUM | PR 리뷰 대기 |
| #112 | AI 퀴즈 생성 프롬프트 품질 개선 | LOW | 대기 |

### 해결 방법

- **#117 디버깅**: 브라우저 콘솔에서 `[Docs]`, `[dbSave]` 로그 확인
- **#116**: AI 프롬프트 응답 파싱 로직 점검 필요
- **#114**: PR #115 머지 후 PostgreSQL + PostgREST로 전환 예정

## 작업 시 주의사항

1. **XSS**: 사용자 HTML 입력 시 DOMPurify 필수
2. **퀴즈 정답 인덱스**: 0 처리 주의 (`=== 0` 대신 `hasOwnProperty` 사용)
3. **SSRF 방어**: `validateUrlForSSRF()` - localhost, 내부 IP 차단됨
4. **AI 엔진**: Local AI 우선 (vLLM), 미설정 시 WebLLM fallback (WebGPU 필요)
5. **RLS 에러**: 403/500 에러 시 `database/fixes/rls_complete_redesign.sql` 적용

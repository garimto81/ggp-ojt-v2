# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJT Master - AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템 (v2.12.0)

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19 + Vite 7 + Tailwind CSS 4 |
| **State** | React Query (TanStack Query v5) |
| **Backend/DB** | Supabase (PostgreSQL + Auth + RLS) |
| **Local Cache** | Dexie.js (IndexedDB) |
| **AI** | WebLLM (브라우저 내 LLM - 무료, 오프라인 가능) |
| **Charts** | Chart.js + react-chartjs-2 |
| **Image Storage** | Cloudflare R2 (Worker 프록시) |
| **Editor** | Quill 2.0 (Rich Text) |
| **PDF** | pdfjs-dist (PDF 텍스트 추출) |
| **Hosting** | Vercel (자동 배포) |

## Commands

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
npm run test                    # Watch 모드
npm run test:run                # 1회 실행
npm run test:coverage           # 커버리지 리포트
npx vitest run src/utils/api.test.js              # 단일 파일
npx vitest run -t "checkAIStatus"                 # 특정 테스트명 매칭

# === E2E 테스트 (Playwright) - 루트에서 실행 ===
# 테스트 파일: tests/*.spec.js
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

# Note: No AI API keys required! WebLLM runs entirely in the browser.
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
│       │   │   ├── hooks/       # AIContext
│       │   │   └── services/    # webllm, contentGenerator, quizValidator
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
<QueryClientProvider>      // React Query (staleTime: 5분)
  <ToastProvider>          // Toast 알림
    <AuthProvider>         // 인증 상태 (features/auth/hooks/)
      <AIProvider>         // WebLLM 상태 (features/ai/hooks/)
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

RLS 정책: `database/migrations/supabase_schema.sql`, `database/fixes/supabase_fix_rls.sql` 참조

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
| **Admin** | 전체 관리, Mentor 모드 전환 | `admin_dashboard` |
| **Mentor** | AI 콘텐츠 생성, 자료 CRUD | `mentor_dashboard` |
| **Mentee** | 로드맵 탐색, 학습, 퀴즈 (읽기 전용) | `mentee_list` → `mentee_study` |

**Admin 모드 전환**: Header "모드" 버튼 → `sessionStorage`로 세션 유지

## AI Content Generation (WebLLM)

### WebLLM 설정

- **Default Model**: Qwen 2.5 3B (한국어 우수, 2.4GB)
- **Fallback Model**: Gemma 2 2B (저사양용, 1.8GB)
- Temperature: 0.3
- Max tokens: 4096
- **요구사항**: WebGPU 지원 브라우저 (Chrome 113+, Edge 113+)

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

### WebLLM 장점

- **무료**: API 비용 없음
- **프라이버시**: 데이터가 브라우저 외부로 전송되지 않음
- **오프라인**: 첫 모델 다운로드 후 오프라인 사용 가능

## Error Handling

| 영역 | 전략 |
|------|------|
| WebLLM 로드 실패 | WebGPU 미지원 안내 표시 |
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

## 작업 시 주의사항

1. **XSS**: 사용자 HTML 입력 시 DOMPurify 필수
2. **퀴즈 정답 인덱스**: 0 처리 주의 (`=== 0` 대신 `hasOwnProperty` 사용)
3. **SSRF 방어**: `validateUrlForSSRF()` - localhost, 내부 IP 차단됨
4. **WebGPU**: Chrome/Edge 113+ 필수, Safari/Firefox 미지원

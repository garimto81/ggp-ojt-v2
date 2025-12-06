# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJT Master - AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템 (v2.10.0)

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19 + Vite 7 + Tailwind CSS 4 + React Query 5 |
| **Backend/DB** | Supabase (PostgreSQL + Auth + RLS) |
| **Local Cache** | Dexie.js (IndexedDB) |
| **AI** | WebLLM (브라우저 내 LLM - 무료, 오프라인 가능) |
| **Image Storage** | Cloudflare R2 (Worker 프록시) |
| **Editor** | Quill 2.0 (Rich Text) |
| **PDF** | pdfjs-dist (PDF 텍스트 추출) |
| **Hosting** | Vercel (자동 배포) |

## Commands

```bash
# === Vite 앱 (src-vite/) ===
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

# === E2E 테스트 (Playwright) - 루트에서 실행 ===
# 기본 baseURL: https://ggp-ojt-v2.vercel.app (프로덕션)
# 로컬 테스트: playwright.config.js 17행 주석 해제, 16행 주석 처리
# 로컬 서버: cd src-vite && npm run dev 후 포트 확인
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
VITE_R2_WORKER_URL=https://ojt-r2-upload.your-worker.workers.dev

# Note: No AI API keys required! WebLLM runs entirely in the browser.
```

## Architecture

### 프로젝트 구조 (Feature-Based)

```
ggp_ojt_v2/
├── src-vite/                   # Vite 앱 (프로덕션)
│   └── src/
│       ├── features/           # Feature-Based 구조 (v2.10.0+)
│       │   ├── admin/          # 관리자 기능
│       │   │   ├── components/ # AdminDashboard, AnalyticsCharts
│       │   │   └── hooks/      # useUsers, useAnalytics
│       │   ├── ai/             # AI 기능
│       │   │   ├── components/ # AIEngineSelector
│       │   │   ├── hooks/      # AIContext
│       │   │   └── services/   # webllm, contentGenerator, quizValidator
│       │   ├── auth/           # 인증 기능
│       │   │   ├── components/ # RoleSelectionPage
│       │   │   └── hooks/      # AuthContext
│       │   ├── docs/           # 문서 기능
│       │   │   ├── components/ # MentorDashboard, PdfViewer, UrlPreviewPanel
│       │   │   ├── hooks/      # useDocs
│       │   │   └── services/   # urlExtractor
│       │   └── learning/       # 학습 기능
│       │       ├── components/ # MenteeList, MenteeStudy
│       │       └── hooks/      # useLearningRecords
│       ├── contexts/           # 전역 Context (DocsContext, ToastContext)
│       ├── hooks/              # 공용 Hooks (useDebounce)
│       ├── layouts/            # Header
│       ├── utils/              # API, DB, Helpers, CORS-proxy
│       │   └── security/       # validateUrl (SSRF 방어)
│       ├── constants.js        # 설정값
│       ├── App.jsx             # 라우팅
│       └── main.jsx            # 엔트리포인트
├── ojt-r2-upload/              # Cloudflare R2 Worker
├── database/                   # SQL 스키마 및 마이그레이션
│   ├── migrations/             # 스키마 생성/변경 SQL
│   └── fixes/                  # RLS/성능 수정 SQL
├── tests/                      # Playwright E2E 테스트
├── vercel.json                 # Vercel 배포 설정
└── docs/                       # 가이드 문서
```

### Path Aliases (v2.10.0+)

`vite.config.js` 및 `jsconfig.json`에 설정됨:

| Alias | 경로 |
|-------|------|
| `@` | `src/` |
| `@features` | `src/features/` |
| `@utils` | `src/utils/` |
| `@contexts` | `src/contexts/` |
| `@layouts` | `src/layouts/` |
| `@hooks` | `src/hooks/` |
| `@components` | `src/components/` |

```javascript
// 사용 예시
import { useAuth } from '@features/auth/hooks/AuthContext';
import { Toast } from '@contexts/ToastContext';
import { ROLES } from '@/constants';
```

### 상태 관리 패턴 (React Query + Context API)

**React Query** - 서버 상태 (비동기 데이터 페칭, 캐싱):
```javascript
// features/*/hooks/use*.js
import { useQuery, useMutation } from '@tanstack/react-query';

export function useDocs(filters) {
  return useQuery({
    queryKey: ['docs', filters],
    queryFn: () => fetchDocs(filters),
  });
}
```

**Context API** - 클라이언트 상태 (인증, UI 상태):
```
main.jsx
  └── QueryClientProvider (React Query)
        └── ToastProvider (@contexts/ToastContext)
              └── AuthProvider (@features/auth/hooks/AuthContext)
                    ├── user, viewState, sessionMode 관리
                    └── handleGoogleLogin, handleLogout, handleModeSwitch
                    └── AIProvider (@features/ai/hooks/AIContext)
                          ├── webllmStatus 상태
                          └── loadWebLLM, unloadModel
                          └── DocsProvider (@contexts/DocsContext)
                                ├── selectedDoc, generatedDoc 관리
                                └── CRUD 작업
```

### 데이터 흐름

```
[사용자 액션]
     │
     ▼
[React Component] ──→ [Context Hook] ──→ [utils/api.js]
     │                    │                    │
     │                    │                    ▼
     │                    │            [WebLLM / Supabase]
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

1. **버전 파일**: `package.json`, `src-vite/package.json`, `CLAUDE.md`
2. **버전 규칙**: MAJOR.MINOR.PATCH (버그=PATCH, 기능=MINOR, 큰변경=MAJOR)

```bash
# 최신 커밋 해시 확인
git log -1 --format='%h'
```

## Known Issues & Roadmap

### v2.10.0 완료된 작업

| 이슈 | 제목 | 상태 |
|------|------|------|
| #57 | Feature-Based 폴더 구조 전환 | ✅ CLOSED |
| #58 | React Query 도입 | ✅ CLOSED |
| #54 | AdminDashboard PRD 갭 해결 | ✅ CLOSED |
| #60 | 오프라인 동기화 완성 | ✅ CLOSED |
| #71 | completed_at 타입 통일 | ✅ CLOSED |
| #73 | 절대경로 alias 도입 | ✅ CLOSED |
| #78 | CSRF 토큰 방어 강화 | ✅ CLOSED |

### 진행 중인 개선사항

| 이슈 | 제목 | 우선순위 |
|------|------|----------|
| #74 | CLAUDE.md Feature-Based 구조 반영 | P1 |
| #75 | React Query vs Context API 역할 명확화 | P2 |
| #76 | 색상/Spinner/Input 패턴 표준화 | P2 |
| #77 | 접근성 속성 전면 적용 | P2 |

### AdminDashboard 통계 (구현 완료)

| 기능 | 상태 | 위치 |
|------|------|------|
| 멘티 진도율 | ✅ 구현됨 | `ProgressDistributionChart` |
| 취약 파트 분석 | ✅ 구현됨 | `quizWeakness` 테이블 |
| 멘토 기여도 | ✅ 구현됨 | `MentorContributionChart` |
| 학습 활동 그래프 | ✅ 구현됨 | `ActivityChart` (최근 7일) |
| 팀별 통계 | ✅ 구현됨 | `TeamStatsChart` |

## 작업 시 주의사항

1. **XSS**: 사용자 HTML 입력 시 DOMPurify 필수
2. **퀴즈 정답 인덱스**: 0 처리 주의 (`=== 0` 대신 `hasOwnProperty` 사용)
3. **SSRF 방어**: `validateUrlForSSRF()` - localhost, 내부 IP 차단됨
4. **WebGPU**: Chrome/Edge 113+ 필수, Safari/Firefox 미지원

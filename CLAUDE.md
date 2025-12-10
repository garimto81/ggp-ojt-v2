# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJT Master - AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템

**Version**: 1.7.0 | **Deployment**: Vercel + Supabase Cloud + Gemini API

**Production URL**: https://ggp-ojt-v2.vercel.app

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19 + Vite 7 + Tailwind CSS 4 |
| **Deployment** | Vercel (자동 배포) |
| **Database** | Supabase (PostgreSQL + Auth + REST API) |
| **AI** | Google Gemini API (gemini-2.0-flash-exp) + WebLLM fallback |
| **Editor** | Quill 2.0 (Rich Text) |
| **PDF** | pdfjs-dist |
| **Charts** | Chart.js + react-chartjs-2 |
| **Package Manager** | pnpm 9.15+ |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Production                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Browser ──HTTPS──▶ Vercel Edge                             │
│      │                 │                                    │
│      │                 └── React SPA (정적 파일)             │
│      │                                                      │
│      ├── Supabase REST API ──▶ PostgreSQL                  │
│      │   (cbvansmxutnogntbyswi.supabase.co)                │
│      │                                                      │
│      └── Gemini API ──▶ AI 콘텐츠 생성                      │
│          (generativelanguage.googleapis.com)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Commands

```bash
# === 개발 서버 (src-vite 디렉토리) ===
cd src-vite
npm run dev                    # http://localhost:5173

# === 단위 테스트 - Vitest ===
npm run test                   # Watch 모드
npm run test:run               # 1회 실행
npx vitest run src/features/ai/agents/gemini/  # 디렉토리 테스트

# === E2E 테스트 - Playwright (루트 디렉토리) ===
pnpm test                      # 전체 E2E
npx playwright test --headed   # 브라우저 표시

# === 코드 품질 ===
npm run lint:fix               # ESLint 자동 수정
npm run format                 # Prettier 포맷팅

# === 빌드 (Vercel 자동 실행) ===
npm run build                  # dist/ 생성
```

## Path Aliases

| Alias | 경로 |
|-------|------|
| `@` | `src/` |
| `@/features` | `src/features/` |
| `@/shared` | `src/shared/` |
| `@/utils` | `src/utils/` |
| `@/contexts` | `src/contexts/` |
| `@/hooks` | `src/hooks/` |
| `@/components` | `src/components/` |

> ⚠️ **중요**: 모든 alias는 `@/` 형식 사용 필수 (`@contexts` ❌ → `@/contexts` ✅)

## Project Structure

```
ggp_ojt_v2/
├── src-vite/                    # React 앱 (메인 코드베이스)
│   └── src/
│       ├── features/            # Feature-Based 모듈 (Block Agent System)
│       │   ├── admin/           # 관리자 대시보드
│       │   ├── ai/              # AI 콘텐츠 생성
│       │   │   └── agents/gemini/  # Gemini API 전담 에이전트
│       │   ├── auth/            # 인증 (이메일/비밀번호)
│       │   ├── content/create/  # MentorDashboard (AI 생성)
│       │   ├── content/manage/  # 문서 CRUD
│       │   ├── learning/study/  # MenteeList, MenteeStudy
│       │   └── learning/quiz/   # QuizSession, QuizResult
│       ├── contexts/            # 전역 Context (Auth, AI, Toast)
│       └── utils/               # API, helpers, logger
├── database/                    # Supabase 스키마 문서
│   └── agents/supabase/         # DB 전담 에이전트 문서
├── tests/                       # Playwright E2E 테스트
└── docs/                        # 프로젝트 문서
```

## Environment Variables (Vercel)

Vercel Dashboard > Settings > Environment Variables에서 설정:

| 변수명 | 설명 | 환경 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Key | Production, Preview |
| `VITE_GEMINI_API_KEY` | Google Gemini API Key | Production, Preview |
| `VITE_R2_WORKER_URL` | Cloudflare R2 Worker URL | Production, Preview |

**중요**: 환경변수 변경 후 Redeploy 필요 (Vite는 빌드 타임에 환경변수 주입)

## Provider Hierarchy

```jsx
<QueryClientProvider>      // React Query
  <ToastProvider>          // Toast 알림
    <AuthProvider>         // 인증 상태
      <AIProvider>         // AI 상태 (Gemini + WebLLM)
        <DocsProvider>     // 문서 상태
          <App />
        </DocsProvider>
      </AIProvider>
    </AuthProvider>
  </ToastProvider>
</QueryClientProvider>
```

## Data Flow

**API 패턴**: Supabase JS Client → Supabase REST API → PostgreSQL

```
[React Component] ──→ [Supabase Client] ──→ [Supabase Cloud] ──→ [PostgreSQL]
```

## Database Schema (Core Tables)

```sql
users (id UUID PK, name, role, department, status, created_at)
ojt_docs (id UUID PK, title, team, team_id FK, step, sections JSONB, quiz JSONB, author_id, status)
learning_records (id UUID PK, user_id, doc_id, score, total_questions, passed)
teams (id UUID PK, name, slug, display_order, is_active)
departments (id UUID PK, name, code, is_active)
```

### RLS 정책

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| users | 본인 OR Admin | 본인만 | 본인 OR Admin | - |
| ojt_docs | 모두 | Mentor/Admin | 작성자 OR Admin | 작성자 OR Admin |
| learning_records | 본인 OR Admin | 본인만 | 본인만 | - |

**RLS Helper 함수**: `rls_is_admin()`, `rls_is_mentor_or_admin()`, `rls_get_role()`

## Role-Based Access

| 역할 | 권한 | 초기 화면 |
|------|------|-----------|
| **Admin** | 전체 관리, 사용자 승인 | `admin_dashboard` |
| **Mentor** | AI 콘텐츠 생성, 자료 CRUD | `mentor_dashboard` |
| **Mentee** | 학습, 퀴즈 (읽기 전용) | `mentee_list` |

## Authentication

```
회원가입 → status='pending' → Admin 승인 → status='approved' → 로그인 가능
```

- 아이디: 내부적으로 `@local` 접미사 추가
- Admin 승인: Admin Dashboard > "승인 관리" 탭

## AI Content Generation

### Engine Priority

1. **Gemini API** (Primary) - `gemini-2.0-flash-exp`
2. **WebLLM** (Fallback) - 브라우저 내 로컬 AI (Qwen 2.5 3B)

### gemini-agent (`features/ai/agents/gemini/`)

| 파일 | 역할 |
|------|------|
| `client.js` | Gemini API 클라이언트 + Rate Limiting |
| `prompts.js` | OJT 생성 프롬프트 템플릿 |
| `parser.js` | JSON 응답 파싱, 정규화 |
| `validator.js` | 퀴즈/콘텐츠 품질 검증 |

```javascript
// 사용 예시
import { generateOJTContent, checkStatus } from '@features/ai/agents/gemini';
```

### Rate Limiting

- 429, 503, 500 에러 시 자동 재시도
- Exponential backoff: 1s → 2s → 4s
- 최대 3회 재시도

### Error Handling

| 영역 | 전략 |
|------|------|
| Gemini API 실패 | WebLLM fallback 자동 시도 |
| AI JSON 파싱 실패 | Regex fallback |
| 퀴즈 부족 | `createPlaceholderQuiz()` 자동 생성 |

## Block Agent System v1.3.0

App.jsx에서 React.lazy()를 통한 코드 분할:

```javascript
const AdminDashboard = lazy(() =>
  import('@features/admin').then((m) => ({ default: m.AdminDashboard }))
);
```

### Frontend Agents (7개)

| Agent | 경로 | 핵심 파일 |
|-------|------|----------|
| auth-agent | `features/auth/` | RoleSelectionPage, AuthContext |
| content-create-agent | `features/content/create/` | MentorDashboard, ContentInputPanel |
| content-manage-agent | `features/content/manage/` | MyDocsList, DocsContext |
| learning-study-agent | `features/learning/study/` | MenteeList, MenteeStudy, SectionViewer |
| learning-quiz-agent | `features/learning/quiz/` | QuizSession, QuizResult, useLearningRecord |
| ai-agent | `features/ai/` | AIEngineSelector, AIContext |
| admin-agent | `features/admin/` | AdminDashboard, useUsers, useAnalytics |

### Service Agent (AI)

| Agent | 경로 | 역할 |
|-------|------|------|
| **gemini-agent** | `features/ai/agents/gemini/` | Gemini API 전담, OJT 콘텐츠 생성 |

### Backend Agent (Database)

| Agent | 경로 | 역할 |
|-------|------|------|
| **supabase-agent** | `database/agents/supabase/` | DB 스키마, 마이그레이션, RLS 정책 관리 |

**상세 문서**: `docs/BLOCK_AGENT_SYSTEM.md`

### 코드 오염 방지 규칙 (SSOT 패턴)

> **Issue #182 교훈**: Context 중복으로 인한 "useAuth must be used within AuthProvider" 에러 발생

#### Context 관리 규칙

```
┌─────────────────────────────────────────────────────────────┐
│                SSOT (Single Source of Truth)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  src/contexts/          ← 유일한 Context 정의 위치          │
│       ├── AuthContext.jsx                                   │
│       ├── AIContext.jsx                                     │
│       ├── DocsContext.jsx                                   │
│       └── ToastContext.jsx                                  │
│                                                             │
│  features/*/index.js    ← re-export만 허용 (정의 금지)      │
│       └── export { useAuth } from '@/contexts/AuthContext'; │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| 규칙 | 올바른 예 | 잘못된 예 |
|------|-----------|-----------|
| Context 정의 위치 | `src/contexts/` | `features/*/hooks/` |
| Context import | `@/contexts/AuthContext` | `./hooks/AuthContext` |
| features index.js | `export from '@/contexts/...'` | `export from './hooks/...'` |

#### 왜 중요한가?

React의 `createContext()`는 **호출될 때마다 새로운 인스턴스** 생성:
- 동일한 코드라도 다른 파일에서 호출하면 **별개의 Context**
- Provider와 Consumer가 다른 인스턴스 참조 시 **연결 실패**
- "must be used within Provider" 에러 발생

## Testing

### Test File Locations

- **Unit tests**: `src-vite/src/**/*.test.{js,jsx}` (컴포넌트/훅과 동일 디렉토리)
- **E2E tests**: `tests/*.spec.js` (루트 디렉토리)

### Test Coverage

| 영역 | 테스트 수 |
|------|----------|
| gemini-agent | 43개 (client, parser, validator) |
| learning-quiz | 퀴즈 로직 테스트 |

## Important Notes

1. **XSS 방지**: 사용자 HTML 입력 시 DOMPurify 필수 (`import DOMPurify from 'dompurify'`)
2. **퀴즈 정답 인덱스**: 0 처리 주의 (`hasOwnProperty` 또는 `!== undefined` 사용)
3. **Vercel 환경변수**: 변경 후 반드시 Redeploy 필요
4. **RLS 함수명**: `is_admin()` 삭제됨 → `rls_is_admin()` 사용

---

## 버전 관리 (필수)

### PR/Issue 생성·업데이트 시 필수 항목

| 항목 | 형식 | 예시 |
|------|------|------|
| **버전** | Semantic Versioning | `v1.5.0` |
| **커밋 해시** | 7자리 short hash | `e9b4a29` |
| **이슈/PR 태그** | `#번호` 또는 `Closes #번호` | `#181`, `Closes #179` |

### 버전 업데이트 규칙

```
MAJOR.MINOR.PATCH (Semantic Versioning)
├── MAJOR: 호환성 깨지는 변경 (API 변경, DB 스키마 변경)
├── MINOR: 새 기능 추가 (하위 호환) - 새 에이전트, 새 컴포넌트
└── PATCH: 버그 수정, 문서 수정
```

### 워크플로우

```
1. Issue 생성 → 이슈 번호 발급 (#N)
2. 브랜치 생성 → feat/issue-N-desc
3. 작업 완료 → 커밋 (해시 생성)
4. PR 생성 → 이슈 태그 연결 (Closes #N)
5. 머지 전 → CLAUDE.md 버전 범프
6. 머지 후 → Vercel 자동 배포
```

### 커밋 메시지 형식

```
<type>(<scope>): <subject> (#issue)

- 변경 내용 설명

Refs: #issue1, #issue2
Closes #issue (PR에서 이슈 자동 종료 시)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### 버전 히스토리

| 버전 | 날짜 | 주요 변경 |
|------|------|-----------|
| v1.7.0 | 2025-12-10 | 신규 콘텐츠 status='review' 기본값 설정 (#186) |
| v1.6.0 | 2025-12-10 | SSOT 패턴 적용, Context 중복 제거, import 경로 정규화 (#182) |
| v1.5.0 | 2025-12-10 | 문서 Vercel 기준 정리 (#183) |
| v1.4.0 | 2025-12-10 | gemini-agent Rate Limiting, 43개 테스트 (#179, #181) |
| v1.3.0 | 2025-12-10 | gemini-agent 신설 (Block Agent System v1.3.0) |
| v1.2.0 | 2025-12 | supabase-agent 추가, departments 테이블 |
| v1.0.0 | 2025-12 | 초기 릴리스 |

---

## 현재 진행 중인 작업 (2025-12-10)

### Issue #186: 콘텐츠 검토대기 표시 ✅

**상태**: 완료

- 신규 콘텐츠 저장 시 `status='review'` 기본값 설정
- Admin '검토대기' 필터에 정상 표시

### Issue #182: AuthContext 오염 수정 ✅

**상태**: 완료

- SSOT 패턴 적용, Context 중복 제거
- Import 경로 정규화 (`@/contexts/` 형식)

### Issue #178: Supabase DB 정리

**상태**: 🔄 LMS 확장 테이블 처리 결정 대기

**관련 문서**: `database/agents/supabase/MIGRATION_PLAN.md`

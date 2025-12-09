# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJT Master - AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템

**Architecture**: Local-Only Docker 배포 (PostgreSQL + PostgREST + nginx)

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19 + Vite 7 + Tailwind CSS 4 |
| **State** | Supabase Client (PostgREST 호환) |
| **Backend** | PostgreSQL 16 + PostgREST v12 (Self-hosted) |
| **AI** | Local AI (vLLM Qwen3-4B) + WebLLM fallback |
| **Proxy** | nginx (SPA 서빙 + API 프록시) |
| **Editor** | Quill 2.0 (Rich Text) |
| **PDF** | pdfjs-dist |
| **Charts** | Chart.js + react-chartjs-2 |
| **Package Manager** | pnpm 9.15+ |

## Architecture

```
Browser ──HTTPS──▶ nginx:8443
                      │
                      ├── / ──▶ React SPA (정적 파일)
                      ├── /rest/v1/* ──▶ PostgREST:3000 ──▶ postgres
                      └── /api/v1/* ──▶ vLLM (외부 서버 10.10.100.209:8001)
```

### Docker Services

| 서비스 | 역할 | 포트 |
|--------|------|------|
| postgres | Self-hosted PostgreSQL | 5432 |
| postgrest | PostgreSQL REST API | 3000 |
| nginx | 프론트엔드 + API 프록시 | 8080, 8443 |
| vLLM | AI 서버 (외부) | 8001 |

## Commands

```bash
# === 개발 서버 (src-vite 디렉토리) ===
cd src-vite
npm run dev                    # http://localhost:5173

# === 단위 테스트 - Vitest (src-vite 디렉토리) ===
npm run test                   # Watch 모드
npm run test:run               # 1회 실행
npx vitest run src/utils/api.test.js           # 단일 파일
npx vitest run src/features/learning/quiz/     # 디렉토리

# === E2E 테스트 - Playwright (루트 디렉토리) ===
pnpm test                      # 전체 E2E (Docker 서버 필요)
npx playwright test tests/e2e-homepage.spec.js # 단일 파일
npx playwright test --headed   # 브라우저 표시

# === 코드 품질 (src-vite 디렉토리) ===
npm run lint:fix               # ESLint 자동 수정
npm run format                 # Prettier 포맷팅

# === 빌드 ===
npm run build                  # dist/ 생성 → Docker nginx 서빙

# === Docker (docker 디렉토리) ===
docker-compose --env-file .env.docker up -d
docker-compose logs -f
```

## Path Aliases

| Alias | 경로 |
|-------|------|
| `@` | `src/` |
| `@features` | `src/features/` |
| `@shared` | `src/shared/` |
| `@utils` | `src/utils/` |
| `@contexts` | `src/contexts/` |
| `@hooks` | `src/hooks/` |
| `@components` | `src/components/` |

## Project Structure

```
ggp_ojt_v2/
├── src-vite/                    # React 앱 (메인 코드베이스)
│   └── src/
│       ├── features/            # Feature-Based 모듈 (Block Agent System)
│       │   ├── admin/           # 관리자 대시보드
│       │   ├── ai/              # AI 콘텐츠 생성 (vLLM + WebLLM)
│       │   ├── auth/            # 인증 (이메일/비밀번호)
│       │   ├── content/create/  # MentorDashboard (AI 생성)
│       │   ├── content/manage/  # 문서 CRUD
│       │   ├── learning/study/  # MenteeList, MenteeStudy
│       │   └── learning/quiz/   # QuizSession, QuizResult
│       ├── contexts/            # 전역 Context (Auth, AI, Toast)
│       └── utils/               # API, helpers, logger
├── docker/                      # Docker 배포 설정
├── database/                    # PostgreSQL 스키마
│   ├── agents/supabase/         # DB 전담 에이전트 문서
│   ├── migrations/              # 마이그레이션 SQL
│   └── init/                    # Docker 초기화 SQL
├── tests/                       # Playwright E2E 테스트
└── docs/                        # 프로젝트 문서
```

## Provider Hierarchy

```jsx
<QueryClientProvider>      // React Query
  <ToastProvider>          // Toast 알림
    <AuthProvider>         // 인증 상태
      <AIProvider>         // AI 상태 (Local AI + WebLLM)
        <DocsProvider>     // 문서 상태
          <App />
        </DocsProvider>
      </AIProvider>
    </AuthProvider>
  </ToastProvider>
</QueryClientProvider>
```

## Data Flow

**API 패턴**: `supabase.from('table').select()` - PostgREST 호환 Supabase JS 클라이언트 사용

```
[React Component] ──→ [Supabase Client] ──→ [nginx /rest/v1/*] ──→ [PostgREST]
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

1. **Local AI (vLLM)** - 사내 서버 `10.10.100.209:8001` (Qwen3-4B)
2. **WebLLM** - 브라우저 fallback (Qwen 2.5 3B)

### AI States (`AIContext.jsx`)

| 상태 | 설명 |
|------|------|
| `LOCAL_AI_READY` | Local AI 사용 가능 |
| `LOCAL_AI_FAILED` | Local AI 실패 → WebLLM fallback |
| `WEBLLM_READY` | WebLLM 사용 가능 |
| `NO_ENGINE` | 사용 가능한 엔진 없음 |

### Error Handling

| 영역 | 전략 |
|------|------|
| Local AI 실패 | WebLLM fallback 자동 시도 |
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

```javascript
// 사용 예시
import { generateOJTContent, checkStatus } from '@features/ai/agents/gemini';
```

### Backend Agent (Database)

| Agent | 경로 | 역할 |
|-------|------|------|
| **supabase-agent** | `database/agents/supabase/` | DB 스키마, 마이그레이션, RLS 정책 관리 |

**상세 문서**: `docs/BLOCK_AGENT_SYSTEM.md`

## Testing

### Test File Locations

- **Unit tests**: `src-vite/src/**/*.test.{js,jsx}` (컴포넌트/훅과 동일 디렉토리)
- **E2E tests**: `tests/*.spec.js` (루트 디렉토리)

### Vitest Configuration

```javascript
// vitest.config.js
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.js',
}
```

### Mock Patterns

```javascript
// Context mock
vi.mock('@/contexts/ToastContext', () => ({
  Toast: { success: vi.fn(), error: vi.fn() }
}));

// API mock
vi.mock('@/utils/api', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));
```

## Important Notes

1. **XSS 방지**: 사용자 HTML 입력 시 DOMPurify 필수 (`import DOMPurify from 'dompurify'`)
2. **퀴즈 정답 인덱스**: 0 처리 주의 (`hasOwnProperty` 또는 `!== undefined` 사용)
3. **vLLM 서버**: 외부 서버 `10.10.100.209:8001` - Docker에 포함 안됨
4. **E2E 테스트**: Docker 서버 실행 필요 (baseURL: `localhost:8080`)
5. **RLS 함수명**: `is_admin()` 삭제됨 → `rls_is_admin()` 사용

## Environment Variables

```bash
# src-vite/.env
VITE_SUPABASE_URL=https://localhost:8443
VITE_SUPABASE_ANON_KEY=<PostgREST JWT token>
VITE_LOCAL_AI_URL=/api
VITE_AUTH_MODE=email

# docker/.env.docker
POSTGRES_PASSWORD=your-secure-password
PGRST_JWT_SECRET=<32자 이상 랜덤>
VLLM_HOST=10.10.100.209
```

## Quick Start (Docker)

```bash
# 1. 환경 변수 설정
cd docker && cp .env.docker.example .env.docker

# 2. SSL 인증서 생성
mkdir -p ssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem -subj "/CN=localhost"

# 3. 프론트엔드 빌드
cd ../src-vite && npm install && npm run build

# 4. Docker 실행
cd ../docker && docker-compose --env-file .env.docker up -d

# 5. 접속: https://localhost:8443
```

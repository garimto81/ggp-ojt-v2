# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJT Master - AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템 (v2.16.0)

**Architecture**: Local-Only Docker 배포 (Issue #114 - Vercel 폐기)

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19 + Vite 7 + Tailwind CSS 4 |
| **State** | React Query (TanStack Query v5) |
| **Backend** | PostgreSQL 16 + PostgREST v12 (Self-hosted) |
| **AI** | Local AI (vLLM Qwen3-4B) + WebLLM fallback |
| **Proxy** | nginx (SPA 서빙 + API 프록시) |
| **Editor** | Quill 2.0 (Rich Text) |
| **PDF** | pdfjs-dist |
| **Charts** | Chart.js + react-chartjs-2 |

## Architecture (Local-Only)

```
┌─────────────────────────────────────────────────────────────┐
│                   Local-Only Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Browser ──HTTPS──▶ nginx:8443                              │
│                        │                                    │
│                        ├── / ──▶ React SPA (정적 파일)       │
│                        ├── /rest/v1/* ──▶ PostgREST:3000    │
│                        │                    │               │
│                        │                    └──▶ postgres   │
│                        │                                    │
│                        └── /api/v1/* ──▶ vLLM (외부 서버)    │
│                                         10.10.100.209:8001  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Docker 서비스

| 서비스 | 역할 | 포트 | 이미지 |
|--------|------|------|--------|
| **postgres** | Self-hosted PostgreSQL | 5432 | postgres:16-alpine |
| **postgrest** | PostgreSQL REST API | 3000 | postgrest/postgrest:v12.0.2 |
| **nginx** | 프론트엔드 서빙 + API 프록시 | 8080, 8443 | nginx:alpine |
| **vLLM** | AI 서버 (외부) | 8001 | 별도 서버 |

## Commands

```bash
# === Docker 배포 (권장) ===
cd docker
docker-compose --env-file .env.docker up -d    # 전체 시작
docker-compose logs -f                          # 로그 확인
docker-compose down                             # 전체 중지

# === 개발 서버 (로컬) ===
cd src-vite
npm run dev                     # http://localhost:5173

# === 프론트엔드 빌드 ===
npm run build                   # dist/ 생성 → nginx 서빙

# === 테스트 ===
# Unit (Vitest)
npm run test                    # Watch 모드
npm run test:run                # 1회 실행
npx vitest run src/utils/api.test.js  # 단일 파일

# E2E (Playwright) - 루트에서 실행
pnpm test                       # 전체 E2E
npx playwright test tests/e2e-homepage.spec.js  # 단일 파일

# === 코드 품질 ===
npm run lint:fix                # ESLint 자동 수정
npm run format                  # Prettier 포맷팅
```

## Environment Variables

```bash
# src-vite/.env
VITE_SUPABASE_URL=https://localhost:8443     # Docker nginx
VITE_SUPABASE_ANON_KEY=<PostgREST JWT token>
VITE_LOCAL_AI_URL=/api                        # nginx 프록시 경로
VITE_AUTH_MODE=email                          # 이메일 인증만

# docker/.env.docker
POSTGRES_PASSWORD=your-secure-password
PGRST_JWT_SECRET=<32자 이상 랜덤>
VLLM_HOST=10.10.100.209                       # AI 서버 IP
```

## Path Aliases

| Alias | 경로 |
|-------|------|
| `@` | `src/` |
| `@features` | `src/features/` |
| `@utils` | `src/utils/` |
| `@contexts` | `src/contexts/` |
| `@hooks` | `src/hooks/` |
| `@layouts` | `src/layouts/` |
| `@components` | `src/components/` |

## Project Structure

```
ggp_ojt_v2/
├── src-vite/                    # React 앱
│   └── src/
│       ├── features/            # Feature-Based 모듈
│       │   ├── admin/           # 관리자 (AdminDashboard, 사용자 승인)
│       │   ├── ai/              # AI 콘텐츠 생성 (vLLM + WebLLM)
│       │   ├── auth/            # 인증 (이메일/비밀번호)
│       │   ├── docs/            # 문서 관리 (MentorDashboard)
│       │   └── learning/        # 학습 기능 (MenteeStudy)
│       ├── contexts/            # 공유 Context (Toast, Docs)
│       ├── utils/               # 유틸리티 (api, db, helpers)
│       └── constants.js         # 설정값
├── docker/                      # Docker 배포
│   ├── docker-compose.yml       # PostgreSQL + PostgREST + nginx
│   ├── nginx.conf               # API 프록시 설정
│   └── ssl/                     # SSL 인증서 (cert.pem, key.pem)
├── database/                    # SQL 스키마
│   └── init/                    # Docker 초기화 스크립트
│       ├── 01_init.sql          # 스키마 생성
│       ├── 02_rls.sql           # RLS 정책
│       └── 03_seed.sql          # 초기 데이터
└── tests/                       # Playwright E2E 테스트
```

## Provider 계층

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

```
[React Component] ──→ [React Query Hook] ──→ [PostgREST API]
     │                       │                     │
     ▼                       ▼                     │
[UI 업데이트] ◄──────── [QueryClient Cache] ◄──────┘
```

**Note**: Dexie.js (IndexedDB) 제거됨 - 서버 직접 통신만 사용

## Database Schema

```sql
-- users: 사용자 프로필
users (id UUID PK, name, role, department, status, created_at)

-- ojt_docs: OJT 문서
ojt_docs (id UUID PK, title, team, team_id FK, step, sections JSONB, quiz JSONB,
          author_id, author_name, status, created_at, updated_at)

-- learning_records: 학습 기록
learning_records (id UUID PK, user_id, doc_id, score, total_questions, passed)

-- teams: 팀 마스터
teams (id UUID PK, name, slug, display_order, is_active)
```

### RLS 정책

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| **users** | 본인 OR Admin | 본인만 | 본인 OR Admin | - |
| **ojt_docs** | 모두 | Mentor/Admin | 작성자 OR Admin | 작성자 OR Admin |
| **learning_records** | 본인 OR Admin | 본인만 | 본인만 | - |
| **teams** | 모두 | Admin | Admin | Admin |

## Role-Based Access

| 역할 | 권한 | 초기 화면 |
|------|------|-----------|
| **Admin** | 전체 관리, 사용자 승인 | `admin_dashboard` |
| **Mentor** | AI 콘텐츠 생성, 자료 CRUD | `mentor_dashboard` |
| **Mentee** | 학습, 퀴즈 (읽기 전용) | `mentee_list` |

## Authentication (Email Only)

```
회원가입 → status='pending' → Admin 승인 → status='approved' → 로그인 가능
```

- **아이디**: 내부적으로 `@local` 접미사 추가
- **관리자 승인**: Admin Dashboard > "승인 관리" 탭

## AI Content Generation

### 엔진 우선순위

1. **Local AI (vLLM)** - 사내 서버 `10.10.100.209:8001` (Qwen3-4B)
2. **WebLLM** - 브라우저 fallback (Qwen 2.5 3B)

### AI 상태 (`AIContext.jsx`)

```javascript
LOCAL_AI_READY    // Local AI 사용 가능
LOCAL_AI_FAILED   // Local AI 실패 → WebLLM fallback
WEBLLM_READY      // WebLLM 사용 가능
NO_ENGINE         // 사용 가능한 엔진 없음
```

### 콘텐츠 생성

| 입력 | 처리 |
|------|------|
| 텍스트 | 섹션 구조화 + 퀴즈 10개 |
| URL | 텍스트 추출 후 분석 |
| PDF | pdfjs-dist 추출 → 섹션화 |

## Error Handling

| 영역 | 전략 |
|------|------|
| Local AI 실패 | WebLLM fallback 자동 시도 |
| AI JSON 파싱 실패 | Regex fallback |
| 퀴즈 부족 | `createPlaceholderQuiz()` 자동 생성 |

## Quick Start (Docker)

```bash
# 1. 환경 변수 설정
cd docker
cp .env.docker.example .env.docker
# POSTGRES_PASSWORD, PGRST_JWT_SECRET 수정

# 2. SSL 인증서 생성
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem -subj "/CN=localhost"

# 3. 프론트엔드 빌드
cd ../src-vite
npm install && npm run build

# 4. Docker 실행
cd ../docker
docker-compose --env-file .env.docker up -d

# 5. 접속: https://localhost:8443
```

## Block Agent System v1.1.0

Feature-based 아키텍처로 7개 전문화된 에이전트 구성:

| Agent | 경로 | 역할 |
|-------|------|------|
| auth-agent | `features/auth/` | 인증 및 역할 관리 |
| content-create-agent | `features/content/create/` | AI 콘텐츠 생성 |
| content-manage-agent | `features/content/manage/` | 문서 CRUD |
| learning-study-agent | `features/learning/study/` | 학습 진행 |
| learning-quiz-agent | `features/learning/quiz/` | 퀴즈 응시/결과 |
| ai-agent | `features/ai/` | AI 엔진 관리 |
| admin-agent | `features/admin/` | 관리자 대시보드 |

**상세 문서**: `docs/BLOCK_AGENT_SYSTEM.md`

## Technical Debt

| 영역 | 문제 | 심각도 |
|------|------|--------|
| 테스트 | 컴포넌트 테스트 커버리지 확대 필요 | MEDIUM |

## 주의사항

1. **XSS**: 사용자 HTML 입력 시 DOMPurify 필수
2. **퀴즈 정답 인덱스**: 0 처리 주의 (`hasOwnProperty` 사용)
3. **vLLM 서버**: 외부 서버 `10.10.100.209:8001` - Docker에 포함 안됨
4. **SSL**: 자체 서명 인증서 사용 시 브라우저 경고 무시 필요

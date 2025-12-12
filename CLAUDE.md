# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OJT Master** - AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템

- **Version**: 2.32.0 (see `src-vite/src/version.js` for SSOT)
- **Production**: https://ggp-ojt-v2.vercel.app (Vercel + Supabase Cloud + Gemini API)

## Tech Stack

| 영역 | 기술 |
|------|------|
| Frontend | React 19 + Vite 7 + Tailwind CSS 4 |
| UI Components | shadcn/ui (Button, Card, Input, Badge, Table, Select, Progress) |
| Database | Supabase (PostgreSQL + REST API) |
| AI | Google Gemini API (gemini-2.5-flash-lite) |
| Editor | Quill 2.0 (Rich Text) |
| PDF | pdfjs-dist + Tesseract.js (OCR) |
| Package Manager | pnpm 9.15+ (root) / npm (src-vite) |

## Commands

```bash
# === 개발 (src-vite 디렉토리에서 실행) ===
cd src-vite
npm run dev              # http://localhost:5173

# === 단위 테스트 (Vitest) ===
npm run test             # Watch 모드
npm run test:run         # 1회 실행
npm run test:coverage    # 커버리지 포함
npx vitest run src/features/ai/agents/gemini/  # 특정 디렉토리만

# === E2E 테스트 (Playwright, 루트 디렉토리) ===
pnpm test                # 전체 E2E
pnpm test:headed         # 브라우저 표시
npx playwright test tests/e2e-homepage.spec.js  # 단일 파일

# === 코드 품질 ===
npm run lint:fix         # ESLint 자동 수정
npm run format           # Prettier 포맷팅

# === 빌드 ===
npm run build            # dist/ 생성 (Vercel 자동 실행)
```

## Architecture

```
Browser ──HTTPS──▶ Vercel Edge ──▶ React SPA
    │
    ├── Supabase REST API ──▶ PostgreSQL
    │
    └── Gemini API ──▶ AI 콘텐츠 생성
```

## Project Structure

```
ggp_ojt_v2/
├── src-vite/                    # React 앱 (메인 코드베이스)
│   └── src/
│       ├── features/            # Feature-Based 모듈 (Block Agent System)
│       │   ├── admin/           # 관리자 대시보드
│       │   ├── ai/              # AI 콘텐츠 생성
│       │   │   └── agents/gemini/  # Gemini API 전담 (client, prompts, parser, validator)
│       │   ├── auth/            # 인증
│       │   ├── content/         # 문서 CRUD (create, manage)
│       │   └── learning/        # 학습 (study, quiz)
│       ├── contexts/            # 전역 Context (SSOT - 유일한 정의 위치)
│       │   ├── AuthContext.jsx
│       │   ├── AIContext.jsx
│       │   ├── DocsContext.jsx
│       │   ├── ToastContext.jsx
│       │   └── VersionContext.jsx  # 버전 자동 업데이트 (v2.31.0+)
│       ├── components/ui/       # shadcn/ui 컴포넌트 (v2.32.0+)
│       ├── shared/              # 공유 유틸리티, 레이아웃
│       └── utils/               # API, helpers, logger
├── database/agents/supabase/    # DB 스키마 문서
├── tests/                       # Playwright E2E 테스트
└── docs/                        # 프로젝트 문서
```

## Path Aliases (vite.config.js)

| Alias | 경로 |
|-------|------|
| `@` | `src/` |
| `@features` | `src/features/` |
| `@shared` | `src/shared/` |
| `@utils` | `src/utils/` (legacy) |
| `@contexts` | `src/contexts/` (legacy) |
| `@components` | `src/components/` (legacy) |

> **참고**: `@/` 형식과 `@prefix` 형식 모두 지원 (하위 호환)

## Provider Hierarchy (main.jsx)

```jsx
<ToastProvider>
  <VersionProvider>       {/* 버전 자동 업데이트 (v2.31.0+) */}
    <AuthProvider>
      <AIProvider>
        <DocsProvider>
          <App />
        </DocsProvider>
      </AIProvider>
    </AuthProvider>
  </VersionProvider>
</ToastProvider>
```

## Core Patterns

### SSOT (Single Source of Truth) - Context 관리

```
src/contexts/          ← 유일한 Context 정의 위치
features/*/index.js    ← re-export만 허용 (정의 금지)
```

**배경**: React의 `createContext()`는 호출마다 새 인스턴스 생성 → 다른 파일에서 정의하면 "must be used within Provider" 에러 발생

### Lazy Loading (App.jsx)

```javascript
const AdminDashboard = lazy(() =>
  import('@features/admin').then((m) => ({ default: m.AdminDashboard }))
);
```

### Gemini Agent (`features/ai/agents/gemini/`)

| 파일 | 역할 |
|------|------|
| `client.js` | API 클라이언트 + Rate Limiting (429→1s→2s→4s 재시도) |
| `prompts.js` | OJT 생성 프롬프트 템플릿 |
| `parser.js` | JSON 응답 파싱, 정규화 |
| `validator.js` | 퀴즈/콘텐츠 품질 검증 |

```javascript
import { generateOJTContent, checkStatus } from '@features/ai/agents/gemini';
```

### Version Auto-Update (v2.31.0+)

빌드 시 `version.json` 생성 → 런타임에 5분 간격 폴링 → 버전 불일치 시 Toast 알림

```javascript
// src/version.js - 버전 정보 SSOT
export const APP_VERSION = '2.32.0';
export const BUILD_HASH = '730f37f';
```

### shadcn/ui Components (v2.32.0+)

`src/components/ui/`에 위치. Radix UI 기반 headless 컴포넌트.

```javascript
import { Button, Card, Input, Badge } from '@/components/ui';
```

## Database Schema

```sql
users (id UUID PK, name, role, department, status, created_at)
ojt_docs (id UUID PK, title, team_id FK, step, sections JSONB, quiz JSONB, author_id, status)
learning_records (id UUID PK, user_id, doc_id, score, total_questions, passed)
teams (id UUID PK, name, slug, display_order, is_active)
```

### 학습 완료 판단 기준

**퀴즈 결과(`learning_records.passed`)로만 판단** (Issue #221)

| 조건 | 상태 |
|------|------|
| `learning_records` 레코드 없음 | 미학습 |
| `passed = false` | 퀴즈 미통과 |
| `passed = true` | ✅ 학습 완료 |

> ⚠️ `learning_progress` 테이블은 DB에 존재하나 **사용하지 않음**

**RLS Helper 함수**: `rls_is_admin()`, `rls_is_mentor_or_admin()`, `rls_get_role()`

## Role-Based Access

| 역할 | 권한 | 초기 화면 |
|------|------|-----------|
| Admin | 전체 관리, 사용자 승인 | `admin_dashboard` |
| Mentor | AI 콘텐츠 생성, 자료 CRUD | `mentor_dashboard` |
| Mentee | 학습, 퀴즈 (읽기 전용) | `mentee_list` |

**인증 흐름**: 회원가입 → status='pending' → Admin 승인 → status='approved' → 로그인

## Environment Variables (Vercel)

| 변수명 | 설명 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Key |
| `VITE_GEMINI_API_KEY` | Google Gemini API Key |

> ⚠️ 환경변수 변경 후 Vercel Redeploy 필요 (빌드 타임 주입)

## Important Notes

1. **XSS 방지**: 사용자 HTML 입력 시 DOMPurify 필수
2. **퀴즈 정답 인덱스**: 0 처리 주의 (`!== undefined` 사용)
3. **RLS 함수명**: `is_admin()` → `rls_is_admin()` (rls_ 접두사 필수)
4. **Graceful Degradation**: Gemini API 실패 시 원문 모드로 전환
5. **버전 관리**: `src/version.js`만 수정 (CLAUDE.md 버전은 참조용)
6. **스키마 없는 필드**: DB 저장 시 `ai_processed`, `ai_error`, `ai_engine` 필드 제거 필요

## Testing

- **Unit tests**: `src-vite/src/**/*.test.{js,jsx}` - Vitest + Testing Library
- **E2E tests**: `tests/*.spec.js` - Playwright
- **Setup file**: `src-vite/src/test/setup.js` (browser API mocks)

## References

| 문서 | 내용 |
|------|------|
| `src-vite/src/version.js` | 버전 정보 SSOT + 변경 이력 |
| `docs/BLOCK_AGENT_SYSTEM.md` | Feature 모듈 상세 |
| `docs/STATE_MANAGEMENT_GUIDE.md` | 상태 관리 가이드 |
| `database/agents/supabase/SCHEMA.md` | DB 스키마 상세 |

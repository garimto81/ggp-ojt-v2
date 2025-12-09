# Block Agent System v1.2.0

OJT Master 프로젝트의 모듈화된 컴포넌트 아키텍처 가이드입니다.

## 개요

Block Agent System은 기능별로 분리된 **8개의 전문화된 에이전트**로 구성됩니다:
- **Frontend Agents (7개)**: UI 컴포넌트 담당
- **Backend Agent (1개)**: Database 담당 (supabase-agent)

각 에이전트는 독립적인 책임 영역을 가지며, 명확한 인터페이스를 통해 협업합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                        OJT Master App                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │  auth   │ │content-create│ │content-manage│ │   admin    │  │
│  │  agent  │ │    agent     │ │    agent     │ │   agent    │  │
│  └────┬────┘ └──────┬───────┘ └──────┬───────┘ └─────┬──────┘  │
│       │             │                │               │          │
│  ┌────┴─────────────┴────────────────┴───────────────┴────┐    │
│  │                    Shared Services                      │    │
│  │         (contexts, utils, constants, hooks)             │    │
│  └────┬─────────────┬────────────────┬───────────────┬────┘    │
│       │             │                │               │          │
│  ┌────┴────┐ ┌──────┴───────┐ ┌──────┴───────┐              │  │
│  │learning │ │learning-quiz │ │      ai      │              │  │
│  │ -study  │ │    agent     │ │    agent     │              │  │
│  │  agent  │ │              │ │              │              │  │
│  └─────────┘ └──────────────┘ └──────────────┘              │  │
└─────────────────────────────────────────────────────────────────┘
```

## 에이전트 구조

### 1. auth-agent (인증)
**경로**: `src/features/auth/`

| 구성요소 | 파일 | 역할 |
|----------|------|------|
| Components | `RoleSelectionPage.jsx` | 역할 선택 UI |
| Hooks | `AuthContext.jsx` | 인증 상태 관리 |

```javascript
// 사용 예시
import { useAuth, RoleSelectionPage } from '@features/auth';

const { user, login, logout, viewState } = useAuth();
```

### 2. content-create-agent (콘텐츠 생성)
**경로**: `src/features/content/create/`

| 구성요소 | 파일 | 역할 |
|----------|------|------|
| Components | `MentorDashboardRefactored.jsx` | 메인 대시보드 (composition) |
| | `ContentInputPanel.jsx` | 콘텐츠 입력 UI |
| | `GeneratedDocsPreview.jsx` | 생성된 문서 미리보기 |
| | `UrlPreviewPanel.jsx` | URL 미리보기 |
| | `SplitViewLayout.jsx` | 분할 뷰 레이아웃 |

```javascript
import { MentorDashboard, ContentInputPanel } from '@features/content/create';
```

### 3. content-manage-agent (콘텐츠 관리)
**경로**: `src/features/content/manage/`

| 구성요소 | 파일 | 역할 |
|----------|------|------|
| Components | `MyDocsList.jsx` | 내 문서 목록 |
| | `QuizPreviewModal.jsx` | 퀴즈 미리보기 모달 |
| Hooks | `DocsContext.jsx` | 문서 상태 관리 |

### 4. learning-study-agent (학습)
**경로**: `src/features/learning/study/`

| 구성요소 | 파일 | 역할 |
|----------|------|------|
| Components | `MenteeStudyRefactored.jsx` | 학습 메인 (composition) |
| | `MenteeList.jsx` | 학습 문서 목록 |
| | `SectionViewer.jsx` | 섹션별 학습 뷰어 |

### 5. learning-quiz-agent (퀴즈)
**경로**: `src/features/learning/quiz/`

| 구성요소 | 파일 | 역할 |
|----------|------|------|
| Components | `QuizSession.jsx` | 퀴즈 응시 화면 |
| | `QuizResult.jsx` | 퀴즈 결과 화면 |
| Hooks | `useLearningRecord.js` | 학습 기록 저장 |

```javascript
import { QuizSession, QuizResult } from '@features/learning/quiz';
import { useLearningRecord } from '@features/learning/quiz';
```

### 6. ai-agent (AI 엔진)
**경로**: `src/features/ai/`

| 구성요소 | 파일 | 역할 |
|----------|------|------|
| Components | `AIEngineSelector.jsx` | AI 엔진 선택 UI |
| Hooks | `AIContext.jsx` | AI 상태 관리 |
| Services | `chromeAI.js` | Chrome AI (Gemini Nano) |
| | `webllm.js` | WebLLM 폴백 |
| | `contentGenerator.js` | 콘텐츠 생성 로직 |
| | `quizValidator.js` | 퀴즈 검증 |

### 7. admin-agent (관리자)
**경로**: `src/features/admin/`

| 구성요소 | 파일 | 역할 |
|----------|------|------|
| Components | `AdminDashboard.jsx` | 관리자 대시보드 |
| Hooks | `useAnalytics.js` | 분석 데이터 |
| | `useUsers.js` | 사용자 관리 |

### 8. supabase-agent (데이터베이스) - NEW
**경로**: `database/agents/supabase/`

| 구성요소 | 파일 | 역할 |
|----------|------|------|
| Docs | `README.md` | 에이전트 가이드, 마이그레이션 규칙 |
| | `SCHEMA.md` | 현재 스키마 레퍼런스 |
| Migrations | `database/migrations/*.sql` | 스키마 변경 SQL |
| | `database/fixes/*.sql` | 핫픽스 SQL |

**책임 영역**:
- 테이블 스키마 설계 및 변경
- RLS (Row Level Security) 정책 관리
- SQL 마이그레이션 스크립트 작성
- 인덱스 최적화, FK 제약조건 관리
- Supabase CLI 명령 (`npx supabase db dump`, `npx supabase db push`)

**RLS Helper 함수**:
```sql
public.rls_is_admin() → BOOLEAN      -- Admin 여부 확인
public.rls_is_mentor_or_admin() → BOOLEAN  -- Mentor/Admin 여부
public.rls_get_role() → TEXT         -- 현재 사용자 역할
```

**주의**: `is_admin()` 함수는 삭제됨. 반드시 `rls_is_admin()` 사용!

## 폴더 구조

```
src/
├── features/                    # Feature-based 모듈
│   ├── auth/                    # @agent auth-agent
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.js            # Barrel exports
│   ├── content/
│   │   ├── create/             # @agent content-create-agent
│   │   └── manage/             # @agent content-manage-agent
│   ├── learning/
│   │   ├── study/              # @agent learning-study-agent
│   │   └── quiz/               # @agent learning-quiz-agent
│   ├── ai/                     # @agent ai-agent
│   └── admin/                  # @agent admin-agent
├── shared/                     # 공유 리소스
│   ├── components/             # 공통 UI 컴포넌트
│   ├── hooks/                  # 공통 훅
│   └── utils/                  # 유틸리티
├── contexts/                   # 레거시 Context (하위호환)
├── components/                 # 레거시 컴포넌트 (Header, ErrorBoundary)
└── utils/                      # 레거시 유틸리티
```

## Import 가이드

### 권장 Import 패턴

```javascript
// ✅ Feature barrel import (권장)
import { MentorDashboard } from '@features/content/create';
import { useAuth } from '@features/auth';

// ✅ Shared utilities
import { sanitizeHtml } from '@/utils/helpers';
import { CONFIG } from '@/constants';

// ⚠️ 레거시 (하위호환 - 점진적 마이그레이션)
import { useAuth } from '@/contexts/AuthContext';
```

### Path Alias 설정

| Alias | 경로 |
|-------|------|
| `@` | `src/` |
| `@features` | `src/features/` |
| `@shared` | `src/shared/` |
| `@utils` | `src/utils/` |
| `@contexts` | `src/contexts/` |
| `@components` | `src/components/` |

## Lazy Loading

App.jsx에서 React.lazy()를 사용한 코드 분할:

```javascript
// Lazy loaded feature components
const AdminDashboard = lazy(() =>
  import('@features/admin').then((m) => ({ default: m.AdminDashboard }))
);

const MentorDashboard = lazy(() =>
  import('@features/content/create').then((m) => ({ default: m.MentorDashboard }))
);

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  {viewState === VIEW_STATES.ADMIN_DASHBOARD && <AdminDashboard />}
</Suspense>
```

## 번들 최적화

`vite.config.js`의 manualChunks 설정으로 vendor 분리:

| Chunk | 포함 모듈 | 크기 |
|-------|----------|------|
| vendor-react | react, react-dom | ~192KB |
| vendor-supabase | @supabase/supabase-js | ~181KB |
| vendor-dexie | dexie | ~96KB |
| vendor-webllm | @mlc-ai/web-llm | ~5.5MB |
| feature-admin | AdminDashboard | ~62KB |
| feature-ai | AI services | ~10KB |

## 테스트 가이드

### 테스트 파일 위치
```
src/features/{agent}/components/*.test.jsx  # 컴포넌트 테스트
src/features/{agent}/hooks/*.test.js        # 훅 테스트
```

### 테스트 실행
```bash
npm run test:run              # 전체 테스트 실행
npm run test                  # Watch 모드
npm run test:coverage         # 커버리지 리포트
```

### Mock 패턴
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

## 마이그레이션 가이드

### 기존 코드에서 신규 구조로 전환

1. **Import 경로 업데이트**
```javascript
// Before
import MentorDashboard from './components/MentorDashboard';

// After
import { MentorDashboard } from '@features/content/create';
```

2. **Barrel Export 추가**
```javascript
// features/{agent}/index.js
export { default as ComponentName } from './components/ComponentName';
export { useHookName } from './hooks/useHookName';
```

3. **레거시 호환 유지**
```javascript
// contexts/index.js - 하위호환 유지
export { AuthProvider, useAuth } from './AuthContext';
// 또는 features에서 re-export
export { useAuth, AuthProvider } from '@features/auth';
```

## 에이전트 주석 규칙

각 파일에 담당 에이전트를 명시:

```javascript
/**
 * ComponentName - 컴포넌트 설명
 * @agent {agent-name}
 * @blocks {block.name}, {block.name2}
 */
```

예시:
```javascript
/**
 * SectionViewer - 섹션 학습 뷰어
 * @agent learning-study-agent
 * @blocks learning.section
 */
```

## 버전 히스토리

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.2.0 | 2025-12 | supabase-agent 추가 (DB 전담), 8개 에이전트 체계 |
| v1.1.0 | 2024-12 | Lazy loading, chunk 분할, 테스트 추가 |
| v1.0.0 | 2024-12 | 초기 아키텍처 설계, 7개 에이전트 구조 |

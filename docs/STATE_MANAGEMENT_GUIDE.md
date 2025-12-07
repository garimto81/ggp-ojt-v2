# State Management Guide - React Query vs Context API

> **Issue #75**: React Query와 Context API 역할 명확화

**최종 업데이트**: 2025-12-07
**버전**: v2.10.0

---

## 개요

이 가이드는 OJT Master v2 프로젝트에서 React Query와 Context API를 언제, 어떻게 사용해야 하는지 명확히 설명합니다.

---

## 핵심 원칙

### React Query - Server State Management

**사용 시기**: 서버에서 가져오거나 저장하는 데이터

**책임**:
- Supabase 데이터 fetch, mutation
- 캐싱, 자동 refetch, 무효화
- 로딩/에러 상태 자동 처리
- Optimistic updates

**예시**:
- 문서 목록 조회 (`useDocs`)
- 학습 기록 저장 (`useSaveLearningRecord`)
- 사용자 역할 변경 (`useUpdateUserRole`)

### Context API - Client State Management

**사용 시기**: 클라이언트 전용 상태 또는 전역 UI 상태

**책임**:
- 인증 세션 상태 (AuthContext)
- AI 엔진 상태 (AIContext)
- UI 전역 상태 (Toast, 선택된 문서)
- 앱 설정

**예시**:
- 현재 로그인 사용자 (`useAuth`)
- WebLLM 모델 로딩 상태 (`useAI`)
- Toast 알림 (`useToast`)
- 선택된 문서 (`useDocs` - DocsContext)

---

## React Query 구현 패턴

### 1. Query Keys Factory

모든 React Query 훅은 Query Keys Factory 패턴을 사용합니다.

**예시**: `src-vite/src/features/docs/hooks/useDocs.js`

```javascript
// Query Keys Factory - 계층적 구조
export const docsKeys = {
  all: ['docs'],                              // 전체 무효화
  lists: () => [...docsKeys.all, 'list'],     // 리스트만 무효화
  list: (filters) => [...docsKeys.lists(), filters], // 특정 필터만
  details: () => [...docsKeys.all, 'detail'],
  detail: (id) => [...docsKeys.details(), id],
  myDocs: (userId) => [...docsKeys.all, 'my', userId],
};

// 사용 예시
export function useDocs(filters = {}) {
  return useQuery({
    queryKey: docsKeys.list(filters),
    queryFn: () => fetchDocs(filters),
  });
}
```

**장점**:
- 키 중복 방지
- 선택적 무효화 가능 (`invalidateQueries({ queryKey: docsKeys.all })`)
- 타입 안전성 (TypeScript 사용 시)

### 2. Mutation with Cache Invalidation

mutation 후 관련 쿼리를 자동으로 무효화하여 최신 데이터 유지.

**예시**: `src-vite/src/features/docs/hooks/useDocs.js`

```javascript
export function useCreateDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDoc,
    onSuccess: (newDoc) => {
      // 전체 docs 쿼리 무효화 → 자동 refetch
      queryClient.invalidateQueries({ queryKey: docsKeys.all });
    },
  });
}
```

### 3. Optimistic Updates

사용자 경험 향상을 위해 서버 응답 전에 UI 먼저 업데이트.

**예시**: `src-vite/src/features/admin/hooks/useUsers.js`

```javascript
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserRole,
    onSuccess: (updatedUser) => {
      // 즉시 캐시 업데이트
      queryClient.setQueryData(usersKeys.detail(updatedUser.id), updatedUser);
      // 리스트 무효화
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}
```

### 4. Offline Fallback

네트워크 실패 시 로컬 캐시(Dexie.js) 사용.

**예시**: `src-vite/src/features/docs/hooks/useDocs.js`

```javascript
async function fetchDocs(filters = {}) {
  try {
    const { data, error } = await supabase.from('ojt_docs').select('*');

    if (error) throw error;

    // Supabase → Dexie 동기화
    for (const doc of data) {
      await dbSave('ojt_docs', doc);
    }

    return data || [];
  } catch (error) {
    // Fallback: 로컬 캐시 사용
    console.warn('[useDocs] Supabase failed, using local cache');
    return await dbGetAll('ojt_docs');
  }
}
```

---

## Context API 구현 패턴

### 1. Authentication Context

**파일**: `src-vite/src/features/auth/hooks/AuthContext.jsx`

**역할**:
- 현재 로그인 사용자 세션 관리
- Supabase auth 이벤트 리스닝
- 뷰 상태 및 모드 전환

**WHY CONTEXT**:
- 인증 상태는 서버 데이터가 아닌 "현재 세션"
- Supabase auth 이벤트를 실시간으로 리스닝해야 함
- 캐싱 불필요 (세션은 싱글톤)

```javascript
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [viewState, setViewState] = useState(VIEW_STATES.LOADING);

  useEffect(() => {
    // Supabase auth 이벤트 리스닝
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => loadUserProfile(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  // ...
}
```

### 2. AI Context

**파일**: `src-vite/src/features/ai/hooks/AIContext.jsx`

**역할**:
- WebLLM 브라우저 엔진 상태 관리
- 모델 로딩/언로드, 진행률 추적
- WebGPU 지원 여부 확인

**WHY CONTEXT**:
- WebLLM은 클라이언트 전용 (서버와 무관)
- 앱 전체에서 공유되는 싱글톤 엔진
- 실시간 진행률 업데이트 필요

```javascript
export function AIProvider({ children }) {
  const [webllmStatus, setWebllmStatus] = useState({
    loaded: false,
    loading: false,
    progress: 0,
    error: null,
  });

  const loadWebLLM = useCallback(async (modelId) => {
    await initWebLLM(modelId, (progressText) => {
      // 실시간 진행률 업데이트
      setWebllmStatus(prev => ({ ...prev, progress }));
    });
  }, []);

  // ...
}
```

### 3. Toast Context

**파일**: `src-vite/src/contexts\ToastContext.jsx`

**역할**:
- 전역 Toast 알림 표시
- react-hot-toast 래퍼

**WHY CONTEXT**:
- 순수 UI 상태 (서버 데이터 무관)
- react-hot-toast가 자체 상태 관리
- 컴포넌트 외부에서도 사용 가능 (`Toast` 객체 export)

```javascript
export const Toast = {
  success(message) {
    toast.success(message, { duration: 3000 });
  },
  error(message) {
    toast.error(message, { duration: 5000 });
  },
};

export function ToastProvider({ children }) {
  return (
    <ToastContext.Provider value={Toast}>
      {children}
      <Toaster position="top-center" />
    </ToastContext.Provider>
  );
}
```

---

## 하이브리드 사례: DocsContext

**파일**: `src-vite/src/contexts/DocsContext.jsx`

**현재 상태**: Legacy + UI State (점진적 마이그레이션 중)

**역할 분리**:

| 역할 | 담당 | 향후 계획 |
|------|------|----------|
| 서버 데이터 CRUD | `useDocs` (React Query) | 완료 |
| UI 상태 (selectedDoc, editingDoc) | DocsContext | 유지 |
| AI 생성 임시 상태 (generatedDoc) | DocsContext | 유지 |
| 로컬 캐시 직접 조회 | DocsContext (Legacy) | 제거 예정 |

**마이그레이션 전략**:
1. 새로운 컴포넌트: `useDocs` (React Query) 사용
2. 기존 컴포넌트: DocsContext 유지 (호환성)
3. 점진적 전환 후 `saveDocument`, `deleteDocument` 제거

**예시**:

```javascript
// ✅ 권장 (React Query)
import { useDocs, useCreateDoc } from '@features/docs/hooks/useDocs';

function MentorDashboard() {
  const { data: docs } = useDocs({ team: 'frontend' });
  const createMutation = useCreateDoc();

  const handleSave = async (newDoc) => {
    await createMutation.mutateAsync(newDoc);
  };
}

// ⚠️ Legacy (DocsContext) - 점진적으로 제거 예정
import { useDocs as useDocsContext } from '@contexts/DocsContext';

function OldComponent() {
  const { allDocs, saveDocument } = useDocsContext();
  // ...
}
```

---

## 의사 결정 흐름도

```
상태 관리가 필요한가?
    │
    ├─ YES → 어떤 종류의 상태인가?
    │         │
    │         ├─ 서버 데이터 (Supabase) → React Query
    │         │   - 문서, 사용자, 학습 기록
    │         │   - useDocs, useUsers, useLearningRecords
    │         │
    │         ├─ 클라이언트 전용 전역 상태 → Context API
    │         │   - 인증 세션 → AuthContext
    │         │   - AI 엔진 → AIContext
    │         │   - Toast → ToastContext
    │         │
    │         └─ 컴포넌트 로컬 상태 → useState
    │             - 폼 입력, 모달 열림/닫힘
    │
    └─ NO → 상태 불필요 (stateless component)
```

---

## 파일 구조

```
src-vite/src/
├── features/
│   ├── admin/hooks/
│   │   └── useUsers.js            # React Query - 사용자 CRUD
│   ├── auth/hooks/
│   │   └── AuthContext.jsx        # Context API - 인증 세션
│   ├── ai/hooks/
│   │   └── AIContext.jsx          # Context API - AI 엔진
│   ├── docs/hooks/
│   │   └── useDocs.js             # React Query - 문서 CRUD
│   └── learning/hooks/
│       └── useLearningRecords.js  # React Query - 학습 기록 CRUD
└── contexts/
    ├── DocsContext.jsx            # Context API - UI 상태 (Legacy)
    └── ToastContext.jsx           # Context API - Toast 알림
```

---

## 코드 주석 표준

모든 상태 관리 파일은 다음 형식의 주석을 포함해야 합니다:

```javascript
/**
 * ROLE: React Query - Server State Management
 *  (또는 Context API - Client State Management)
 *
 * PURPOSE:
 * - [주요 목적 3줄 이내]
 *
 * RESPONSIBILITY:
 * ✅ [담당 책임 1]
 * ✅ [담당 책임 2]
 *
 * NOT RESPONSIBLE FOR:
 * ❌ [담당하지 않는 책임 1] → [대안 제시]
 * ❌ [담당하지 않는 책임 2] → [대안 제시]
 *
 * WHY CONTEXT/REACT QUERY:
 * - [이 방식을 선택한 이유]
 *
 * PATTERN: [사용한 패턴명]
 * - [패턴 설명]
 */
```

---

## 참고 자료

- [React Query 공식 문서](https://tanstack.com/query/latest/docs/react/overview)
- [React Context API 공식 문서](https://react.dev/reference/react/createContext)
- [Issue #58: React Query 도입](https://github.com/your-repo/issues/58)
- [Issue #75: React Query vs Context API 역할 명확화](https://github.com/your-repo/issues/75)

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-07 | v1.0.0 | 초안 작성 (Issue #75) |

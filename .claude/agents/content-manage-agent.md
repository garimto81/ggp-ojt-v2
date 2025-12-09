# Content Manage Agent Rules

**Version**: 1.1.0 | **Domain**: Content Manage | **Level**: 1

---

## Identity

| 속성 | 값 |
|------|-----|
| **Role** | 콘텐츠 관리 전문가 |
| **Scope** | `features/content/manage/` (Vertical Slicing 후) |
| **Managed Blocks** | `content.document`, `content.quiz-mgmt` |

---

## Block Responsibilities

### content.document

| 항목 | 내용 |
|------|------|
| **책임** | 문서 CRUD, Supabase + Dexie 동기화 |
| **입력** | `DocRequest` (create/read/update/delete) |
| **출력** | `OJTDocument` |
| **현재 위치** | `DocsContext.jsx`, `api.js` |

### content.quiz-mgmt

| 항목 | 내용 |
|------|------|
| **책임** | 퀴즈 검증, 재생성 요청 |
| **입력** | `{ quiz, action: 'validate' \| 'regenerate' }` |
| **출력** | `ValidatedQuiz` |
| **현재 위치** | `MentorDashboard.jsx` (퀴즈 프리뷰 모달), `api.js` |

---

## Dependencies

### Internal

```javascript
import { supabase } from '@/shared/utils/supabaseClient';
import { localDb } from '@/shared/utils/db';
import { useAuth } from '@/features/auth';
import { useToast } from '@/shared/contexts/ToastContext';
```

### External

없음 (Supabase는 shared에서 제공)

### Cross-Domain

- `auth-agent`: 작성자 정보 (`author_id`, `author_name`)
- `content-create-agent`: 생성된 문서 전달받음
- `ai-agent`: 퀴즈 재생성 요청

---

## Constraints

### DO

- ✅ DocsContext를 통한 상태 관리
- ✅ Supabase + Dexie 이중 저장 (오프라인 지원)
- ✅ 오프라인 시 sync_queue에 작업 저장
- ✅ 삭제 전 확인 다이얼로그 (`confirmDeleteWithCSRF`)

### DON'T

- ❌ AI 콘텐츠 생성 직접 처리 (content-create-agent 담당)
- ❌ 다른 사용자의 문서 수정 (RLS 정책 의존)
- ❌ 하드코딩된 팀/스텝 값 사용
- ❌ 확인 없이 삭제 실행

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 CONTENT MANAGE FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [content-create-agent] ─── 저장 요청 ───▶ [content.document]│
│                                                  │           │
│                                                  ▼           │
│                                        ┌─────────────────┐  │
│                                        │  saveDocument() │  │
│                                        └────────┬────────┘  │
│                                                  │           │
│                              ┌───────────────────┼───────────┤
│                              │                   │           │
│                              ▼                   ▼           │
│                        [Supabase]          [Dexie.js]       │
│                        (ojt_docs)          (localDb)        │
│                              │                   │           │
│                              └───────────────────┘           │
│                                        │                     │
│                                        ▼                     │
│                               [DocsContext 갱신]             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [퀴즈 관리 요청] ────────────▶ [content.quiz-mgmt]          │
│                                        │                     │
│                              ┌─────────┴─────────┐          │
│                              │                   │          │
│                              ▼                   ▼          │
│                        [검증 모드]         [재생성 모드]     │
│                  validateQuizQuality()   regenerateQuiz()   │
│                              │                   │          │
│                              └─────────┬─────────┘          │
│                                        │                     │
│                                        ▼                     │
│                               [UI 갱신 반환]                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Sync Strategy

| 작업 | 온라인 | 오프라인 |
|------|--------|----------|
| **CREATE** | Supabase → Dexie | Dexie + sync_queue |
| **READ** | Dexie 캐시 우선 → Supabase 동기화 | Dexie only |
| **UPDATE** | Supabase → Dexie | Dexie + sync_queue |
| **DELETE** | Supabase → Dexie | Dexie + sync_queue |

오프라인 큐는 `window.addEventListener('online')` 이벤트로 자동 처리

---

## Error Codes

| Code | 의미 | 처리 |
|------|------|------|
| `DOC_SAVE_FAILED` | 저장 실패 | 오프라인 큐 저장 |
| `DOC_DELETE_FAILED` | 삭제 실패 | 재시도 안내 |
| `DOC_NOT_FOUND` | 문서 없음 | 목록 새로고침 |
| `DOC_UNAUTHORIZED` | 권한 없음 | 에러 표시 |
| `QUIZ_VALIDATE_FAIL` | 퀴즈 검증 실패 | 문제 목록 표시 |
| `QUIZ_REGEN_FAIL` | 재생성 실패 | 수동 수정 유도 |

---

## Testing Guidelines

### Unit Tests

```javascript
describe('content.document', () => {
  it('should save to both Supabase and Dexie', async () => {});
  it('should queue save when offline', async () => {});
  it('should require confirmation before delete', async () => {});
});

describe('content.quiz-mgmt', () => {
  it('should validate quiz and return issues', () => {});
  it('should regenerate selected quiz questions', async () => {});
});
```

---

## Related Files (현재 → 리팩토링 후)

| 현재 파일 | 리팩토링 후 |
|----------|------------|
| `DocsContext.jsx` | `features/content/manage/contexts/DocsContext.jsx` |
| `MentorDashboard.jsx` (내 문서) | `features/content/manage/components/MyDocsList.jsx` |
| `MentorDashboard.jsx` (퀴즈 모달) | `features/content/manage/components/QuizManageModal.jsx` |
| `api.js` (validateQuizQuality) | `features/content/manage/services/quizValidator.js` |
| `db.js` | `shared/utils/db.js` (유지) |

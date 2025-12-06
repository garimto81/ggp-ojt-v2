# Admin 콘텐츠 관리 탭 재설계 기획서

**버전**: 1.0.0
**작성일**: 2025-12-07
**상태**: 승인 대기

---

## 1. 문제 정의

### 1.1 현재 상태
- AdminDashboard.jsx (950줄) 내 콘텐츠 관리 탭
- 테이블 뷰만 제공, 미리보기 기능 없음
- 삭제만 가능, 상태 관리 없음

### 1.2 핵심 문제
1. **미리보기 부재**: 콘텐츠 삭제 판단 시 내용 확인 불가
2. **비효율적 워크플로우**: 멘토 요청 → 검색 → 삭제의 번거로운 프로세스
3. **신고 시스템 없음**: 부적절 콘텐츠 발견 시 관리 수단 부재

---

## 2. 솔루션 개요

### 2.1 핵심 전략
**Master-Detail Split View + 상태 기반 워크플로우**

### 2.2 UI 레이아웃

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [전체] [검토대기 🔴3] [신고됨 🟡2] [숨김]     🔍 검색...    [팀▼] [상태▼] │
├───────────────────────────────────┬─────────────────────────────────────┤
│  콘텐츠 목록 (40%)                │  미리보기 패널 (60%)                │
│  ┌─────────────────────────────┐  │  ┌─────────────────────────────────┐│
│  │ 📄 React Hooks 입문         │  │  │ 📄 React Hooks 입문             ││
│  │    작성자: 김멘토 | 3일전    │◀─│  │ ─────────────────────────────── ││
│  │    [검토대기] ⚠️ 신고 2건   │  │  │ 1. useState 기본                ││
│  │    [👁️] [✏️] [🗑️]          │  │  │    useState는 React의 기본...   ││
│  └─────────────────────────────┘  │  │                                 ││
│  ┌─────────────────────────────┐  │  │ 2. useEffect 활용               ││
│  │ 📄 TypeScript 가이드        │  │  │    컴포넌트 생명주기...          ││
│  │    작성자: 박멘토 | 1주전    │  │  │                                 ││
│  │    [게시됨] ✅               │  │  ├─────────────────────────────────┤│
│  └─────────────────────────────┘  │  │ 📝 퀴즈 미리보기 (10문항)       ││
│                                   │  │ ─────────────────────────────── ││
│                                   │  │ Q1. useState의 반환값은?        ││
│                                   │  │ Q2. useEffect 의존성 배열...    ││
│                                   │  └─────────────────────────────────┘│
│                                   │  ┌─────────────────────────────────┐│
│                                   │  │ [📤 게시] [👁️ 숨기기] [🗑️ 삭제]││
│                                   │  └─────────────────────────────────┘│
└───────────────────────────────────┴─────────────────────────────────────┘
```

### 2.3 콘텐츠 상태 워크플로우

```
[draft] ──생성──→ [review] ──승인──→ [published]
                     │                   │
                     │                   ▼ (신고 누적 3건)
                     └──반려──→ [hidden] ◀─────┘
```

| 상태 | 설명 | 표시 |
|------|------|------|
| `draft` | 멘토가 작성 중 | 🔵 임시저장 |
| `review` | 검토 대기 | 🟠 검토대기 |
| `published` | 게시됨 | 🟢 게시됨 |
| `hidden` | 숨김 처리 | ⚫ 숨김 |

---

## 3. 기술 스택

### 3.1 추천 오픈소스 컴포넌트

| 컴포넌트 | 라이브러리 | 버전 | 이유 |
|----------|-----------|------|------|
| Split View | **Allotment** | ^1.20.0 | VS Code 기반, 드래그 리사이즈, 접근성 우수 |
| Data Table | **TanStack Table** | ^8.x | 이미 프로젝트에 포함, 정렬/필터/페이지네이션 |
| Badge | **Tailwind 직접 구현** | - | 의존성 최소화 |

### 3.2 설치 명령어

```bash
cd src-vite
npm install allotment
```

---

## 4. 데이터베이스 스키마

### 4.1 ojt_docs 테이블 확장

```sql
-- 마이그레이션: 20241207_add_content_status.sql
ALTER TABLE ojt_docs
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published'
    CHECK (status IN ('draft', 'review', 'published', 'hidden')),
  ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);

-- 기존 데이터 처리: 모두 published로 설정
UPDATE ojt_docs SET status = 'published' WHERE status IS NULL;

-- 인덱스 추가 (상태별 필터링 성능)
CREATE INDEX IF NOT EXISTS idx_ojt_docs_status ON ojt_docs(status);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_report_count ON ojt_docs(report_count) WHERE report_count > 0;
```

### 4.2 content_reports 테이블 (신규)

```sql
-- 마이그레이션: 20241207_create_content_reports.sql
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES ojt_docs(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'outdated', 'duplicate', 'spam', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id)
);

-- RLS 정책
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- 누구나 신고 가능
CREATE POLICY "Users can create reports" ON content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Admin만 조회/수정 가능
CREATE POLICY "Admins can view all reports" ON content_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Admins can update reports" ON content_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

-- 인덱스
CREATE INDEX idx_content_reports_doc_id ON content_reports(doc_id);
CREATE INDEX idx_content_reports_status ON content_reports(status) WHERE status = 'pending';
```

### 4.3 트리거: 신고 수 자동 업데이트

```sql
CREATE OR REPLACE FUNCTION update_doc_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ojt_docs SET report_count = report_count + 1 WHERE id = NEW.doc_id;
    -- 3건 이상 신고 시 자동 숨김
    UPDATE ojt_docs SET status = 'hidden'
    WHERE id = NEW.doc_id AND report_count >= 3 AND status = 'published';
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ojt_docs SET report_count = GREATEST(report_count - 1, 0) WHERE id = OLD.doc_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_report_count
AFTER INSERT OR DELETE ON content_reports
FOR EACH ROW EXECUTE FUNCTION update_doc_report_count();
```

---

## 5. 컴포넌트 구조

### 5.1 파일 트리

```
src-vite/src/features/admin/
├── components/
│   ├── AdminDashboard.jsx          # 기존 (탭 컨테이너)
│   ├── ContentManagementTab.jsx    # 신규: Split View 컨테이너
│   ├── ContentListPanel.jsx        # 신규: 왼쪽 목록 패널
│   ├── ContentPreviewPanel.jsx     # 신규: 오른쪽 미리보기 패널
│   ├── ContentQuickActions.jsx     # 신규: 인라인 액션 버튼
│   ├── ContentStatusBadge.jsx      # 신규: 상태 배지
│   └── ContentReportsModal.jsx     # 신규: 신고 내역 모달
├── hooks/
│   ├── useContentManagement.js     # 신규: 콘텐츠 관리 로직
│   └── useContentReports.js        # 신규: 신고 관리 로직
└── services/
    └── contentApi.js               # 신규: API 함수
```

### 5.2 컴포넌트 명세

#### ContentManagementTab.jsx
```jsx
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';

export function ContentManagementTab() {
  const [selectedDocId, setSelectedDocId] = useState(null);

  return (
    <div className="h-[calc(100vh-200px)]">
      <Allotment defaultSizes={[40, 60]}>
        <Allotment.Pane minSize={300}>
          <ContentListPanel
            selectedDocId={selectedDocId}
            onSelectDoc={setSelectedDocId}
          />
        </Allotment.Pane>
        <Allotment.Pane minSize={400}>
          <ContentPreviewPanel docId={selectedDocId} />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
```

#### ContentStatusBadge.jsx
```jsx
const STATUS_CONFIG = {
  draft: { label: '임시저장', className: 'bg-blue-100 text-blue-800' },
  review: { label: '검토대기', className: 'bg-orange-100 text-orange-800' },
  published: { label: '게시됨', className: 'bg-green-100 text-green-800' },
  hidden: { label: '숨김', className: 'bg-gray-100 text-gray-800' },
};

export function ContentStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
```

---

## 6. API 설계

### 6.1 새 엔드포인트

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/docs?status=review` | 상태별 문서 조회 |
| PATCH | `/docs/:id/status` | 문서 상태 변경 |
| GET | `/docs/:id/reports` | 문서 신고 목록 |
| POST | `/docs/:id/reports` | 신고 등록 |
| PATCH | `/reports/:id` | 신고 처리 (resolve/dismiss) |

### 6.2 React Query Keys

```javascript
// features/admin/hooks/useContentManagement.js
export const contentKeys = {
  all: ['admin', 'content'],
  lists: () => [...contentKeys.all, 'list'],
  list: (filters) => [...contentKeys.lists(), filters],
  detail: (id) => [...contentKeys.all, 'detail', id],
  reports: (docId) => [...contentKeys.all, 'reports', docId],
};
```

---

## 7. 접근성 (A11y)

### 7.1 키보드 네비게이션

| 키 | 동작 |
|----|------|
| `Tab` | 목록 → 미리보기 → 액션 버튼 순환 |
| `↑/↓` | 목록 내 문서 선택 |
| `Enter` | 선택된 문서 미리보기 |
| `Escape` | 미리보기 패널 닫기 |

### 7.2 ARIA 속성

```jsx
<div role="region" aria-label="콘텐츠 목록">
  <ul role="listbox" aria-label="문서 목록">
    <li role="option" aria-selected={isSelected}>...</li>
  </ul>
</div>

<div role="region" aria-label="콘텐츠 미리보기" aria-live="polite">
  ...
</div>
```

---

## 8. 구현 계획

### Phase 1: 기반 구축 (Day 1)
- [ ] Allotment 설치
- [ ] ContentManagementTab 스켈레톤 생성
- [ ] AdminDashboard에서 기존 콘텐츠 탭 분리

### Phase 2: 목록 패널 (Day 2)
- [ ] ContentListPanel 구현
- [ ] 상태 필터 탭 구현
- [ ] ContentStatusBadge 구현
- [ ] ContentQuickActions 구현

### Phase 3: 미리보기 패널 (Day 3)
- [ ] ContentPreviewPanel 구현
- [ ] 섹션 미리보기
- [ ] 퀴즈 미리보기

### Phase 4: DB 마이그레이션 (Day 4)
- [ ] ojt_docs 컬럼 추가
- [ ] content_reports 테이블 생성
- [ ] RLS 정책 적용
- [ ] 트리거 생성

### Phase 5: API 및 훅 (Day 5)
- [ ] contentApi.js 구현
- [ ] useContentManagement 훅
- [ ] useContentReports 훅

### Phase 6: 신고 시스템 (Day 6)
- [ ] ContentReportsModal 구현
- [ ] 멘티용 신고 버튼 (MenteeStudy)
- [ ] 자동 숨김 로직

### Phase 7: 테스트 및 문서화 (Day 7)
- [ ] E2E 테스트 작성
- [ ] UI_MOCKUP_DESIGN.md 업데이트
- [ ] 배포 및 검증

---

## 9. 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| 콘텐츠 확인 시간 | ~30초 (검색 후 이동) | ~3초 (클릭 즉시) |
| 부적절 콘텐츠 처리 | 수동 요청 | 자동 신고 시스템 |
| 관리자 만족도 | 측정 없음 | 사용성 테스트 90%+ |

---

## 10. 참고 자료

### 10.1 벤치마크 서비스
- WordPress: Post 목록 + Quick Edit
- Strapi: Split View Content Manager
- Notion: Inline Preview
- Ghost CMS: Post Status Workflow

### 10.2 오픈소스 라이브러리
- [Allotment](https://github.com/johnwalley/allotment) - Split View
- [TanStack Table](https://tanstack.com/table) - Data Table
- [shadcn/ui](https://ui.shadcn.com/) - UI Components

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2025-12-07 | 초안 작성 |

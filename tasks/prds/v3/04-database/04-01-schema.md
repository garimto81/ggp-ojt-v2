# 04-01. Database Schema Design

> **Parent**: [Master PRD](../00-master-prd.md) | **Version**: 3.0.0 | **Focus**: DB 스키마 재설계

## 4.1.1 ERD (Entity Relationship Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OJT Master v3.0 ERD                               │
└─────────────────────────────────────────────────────────────────────────────┘

 ┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
 │   auth.users│       │    teams    │       │  admin_settings │
 │  (Supabase) │       │             │       │                 │
 │─────────────│       │─────────────│       │─────────────────│
 │ id (PK)     │       │ id (PK)     │       │ key (PK)        │
 │ email       │       │ name        │       │ value           │
 │ ...         │       │ slug        │       │ updated_at      │
 └──────┬──────┘       │ display_order│       └─────────────────┘
        │              │ is_active   │
        │              └──────┬──────┘
        │                     │
        │                     │
        ▼                     │
 ┌─────────────┐              │
 │    users    │              │
 │─────────────│              │
 │ id (PK/FK)──┼──────────────┤ ← auth.users.id
 │ name        │              │
 │ role        │              │
 │ department  │              │
 │ auth_provider│             │
 │ status      │              │
 │ approved_by │              │
 └──────┬──────┘              │
        │                     │
        │  ┌──────────────────┘
        │  │
        ▼  ▼
 ┌─────────────┐       ┌─────────────────┐
 │  ojt_docs   │       │   doc_sections  │ ← NEW (정규화)
 │─────────────│       │─────────────────│
 │ id (PK)     │──────▶│ doc_id (FK)     │
 │ title       │       │ id (PK)         │
 │ team        │       │ title           │
 │ team_id (FK)│◀──────│ content         │
 │ step        │       │ key_points[]    │
 │ author_id   │       │ order           │
 │ source_type │       └─────────────────┘
 │ source_url  │
 └──────┬──────┘
        │
        │                     ┌─────────────────┐
        │                     │   quiz_pools    │ ← NEW (정규화)
        │                     │─────────────────│
        └────────────────────▶│ doc_id (FK)     │
                              │ id (PK)         │
                              │ question        │
                              │ options[]       │
                              │ correct_index   │
                              │ explanation     │
                              │ difficulty      │
                              │ category        │
                              └─────────────────┘

        │
        ▼
 ┌──────────────────┐      ┌──────────────────┐
 │ learning_records │      │ learning_progress │
 │──────────────────│      │──────────────────│
 │ id (PK)          │      │ id (PK)          │
 │ user_id (FK)     │      │ user_id (FK)     │
 │ doc_id (FK)      │      │ doc_id (FK)      │
 │ score            │      │ status           │
 │ total_questions  │      │ current_section  │
 │ passed           │      │ total_time       │
 │ completed_at     │      │ quiz_attempts    │
 └──────────────────┘      │ best_score       │
                           └──────────────────┘

                           ┌──────────────────┐
                           │   doc_feedback   │ ← NEW
                           │──────────────────│
                           │ id (PK)          │
                           │ doc_id (FK)      │
                           │ user_id (FK)     │
                           │ rating           │
                           │ comment          │
                           └──────────────────┘
```

---

## 4.1.2 Table Definitions

### Core Tables

#### `users` - 사용자 프로필

```sql
CREATE TABLE public.users (
  -- Primary Key (auth.users와 동일)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile
  name TEXT NOT NULL,
  email TEXT,  -- denormalized for convenience
  avatar_url TEXT,

  -- Role & Status
  role TEXT NOT NULL DEFAULT 'mentee'
    CHECK (role IN ('admin', 'mentor', 'mentee')),
  status TEXT DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Organization
  department TEXT,
  team_id UUID REFERENCES public.teams(id),

  -- Auth Info
  auth_provider TEXT DEFAULT 'google'
    CHECK (auth_provider IN ('google', 'email')),

  -- Approval Flow
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_status ON public.users(status);
CREATE INDEX idx_users_team ON public.users(team_id);
CREATE INDEX idx_users_email ON public.users(email);
```

#### `teams` - 팀/부서 마스터

```sql
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,  -- URL-friendly identifier
  description TEXT,

  -- Display
  display_order INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',  -- UI 색상
  icon TEXT,  -- 아이콘 이름

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_teams_slug ON public.teams(slug);
CREATE INDEX idx_teams_active ON public.teams(is_active);
```

---

### Content Tables

#### `ojt_docs` - OJT 교육 문서

```sql
CREATE TABLE public.ojt_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,  -- 문서 요약

  -- Organization
  team TEXT NOT NULL,  -- Legacy (팀명 텍스트)
  team_id UUID REFERENCES public.teams(id),
  step INTEGER NOT NULL DEFAULT 1,  -- 학습 순서

  -- Content Metadata (실제 콘텐츠는 doc_sections)
  section_count INTEGER DEFAULT 0,
  quiz_count INTEGER DEFAULT 0,

  -- Author
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  author_name TEXT,  -- denormalized for performance

  -- Time Estimation
  estimated_minutes INTEGER DEFAULT 30,

  -- Source Info
  source_type TEXT CHECK (source_type IN ('manual', 'url', 'pdf')),
  source_url TEXT,
  source_file TEXT,  -- R2 file key

  -- Status
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,

  -- Statistics (denormalized for performance)
  view_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  avg_rating NUMERIC(2,1) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_docs_team ON public.ojt_docs(team);
CREATE INDEX idx_docs_team_id ON public.ojt_docs(team_id);
CREATE INDEX idx_docs_author ON public.ojt_docs(author_id);
CREATE INDEX idx_docs_step ON public.ojt_docs(step);
CREATE INDEX idx_docs_status ON public.ojt_docs(status);
CREATE INDEX idx_docs_created ON public.ojt_docs(created_at DESC);
```

#### `doc_sections` - 문서 섹션 (NEW - 정규화)

```sql
CREATE TABLE public.doc_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent Document
  doc_id UUID NOT NULL REFERENCES public.ojt_docs(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,  -- HTML or Markdown
  key_points TEXT[] DEFAULT '{}',  -- 핵심 포인트 배열

  -- Order
  section_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sections_doc ON public.doc_sections(doc_id);
CREATE INDEX idx_sections_order ON public.doc_sections(doc_id, section_order);

-- Unique constraint for order within document
CREATE UNIQUE INDEX idx_sections_unique_order
  ON public.doc_sections(doc_id, section_order);
```

#### `quiz_pools` - 퀴즈 문제 은행 (NEW - 정규화)

```sql
CREATE TABLE public.quiz_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent Document
  doc_id UUID NOT NULL REFERENCES public.ojt_docs(id) ON DELETE CASCADE,

  -- Question
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',  -- ["보기1", "보기2", "보기3", "보기4"]
  correct_index INTEGER NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  explanation TEXT,  -- 해설

  -- Classification
  difficulty TEXT DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT DEFAULT 'comprehension'
    CHECK (category IN ('recall', 'comprehension', 'application')),

  -- Statistics
  attempt_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quiz_doc ON public.quiz_pools(doc_id);
CREATE INDEX idx_quiz_difficulty ON public.quiz_pools(difficulty);
CREATE INDEX idx_quiz_category ON public.quiz_pools(category);
```

---

### Learning Tables

#### `learning_progress` - 학습 진행 상태

```sql
CREATE TABLE public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  doc_id UUID NOT NULL REFERENCES public.ojt_docs(id) ON DELETE CASCADE,

  -- Progress
  status TEXT DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  current_section INTEGER DEFAULT 0,
  completed_sections INTEGER[] DEFAULT '{}',  -- 완료한 섹션 ID 배열

  -- Time Tracking
  total_time_seconds INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Quiz Stats
  quiz_attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  last_quiz_at TIMESTAMPTZ,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, doc_id)
);

-- Indexes
CREATE INDEX idx_progress_user ON public.learning_progress(user_id);
CREATE INDEX idx_progress_doc ON public.learning_progress(doc_id);
CREATE INDEX idx_progress_status ON public.learning_progress(status);
CREATE INDEX idx_progress_user_status ON public.learning_progress(user_id, status);
```

#### `learning_records` - 학습 완료 기록

```sql
CREATE TABLE public.learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  doc_id UUID NOT NULL REFERENCES public.ojt_docs(id) ON DELETE CASCADE,

  -- Quiz Result
  score INTEGER NOT NULL,
  total_questions INTEGER DEFAULT 4,
  passed BOOLEAN DEFAULT FALSE,

  -- Quiz Details
  quiz_answers JSONB,  -- 사용자 답변 기록
  quiz_questions JSONB,  -- 출제된 문제 ID 목록

  -- Time
  time_spent_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint (한 문서당 최신 기록만 유지)
  UNIQUE(user_id, doc_id)
);

-- Indexes
CREATE INDEX idx_records_user ON public.learning_records(user_id);
CREATE INDEX idx_records_doc ON public.learning_records(doc_id);
CREATE INDEX idx_records_passed ON public.learning_records(passed);
CREATE INDEX idx_records_completed ON public.learning_records(completed_at DESC);
```

---

### Feedback & Analytics Tables

#### `doc_feedback` - 문서 피드백 (NEW)

```sql
CREATE TABLE public.doc_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  doc_id UUID NOT NULL REFERENCES public.ojt_docs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),  -- 1-5 별점
  comment TEXT,

  -- Helpful Vote
  is_helpful BOOLEAN,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One feedback per user per doc
  UNIQUE(doc_id, user_id)
);

-- Indexes
CREATE INDEX idx_feedback_doc ON public.doc_feedback(doc_id);
CREATE INDEX idx_feedback_user ON public.doc_feedback(user_id);
CREATE INDEX idx_feedback_rating ON public.doc_feedback(rating);
```

#### `admin_settings` - 시스템 설정

```sql
CREATE TABLE public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Settings
INSERT INTO public.admin_settings (key, value, description) VALUES
  ('quiz_pass_threshold', '3', '퀴즈 통과 기준 (n/4)'),
  ('quiz_questions_per_test', '4', '테스트당 문항 수'),
  ('default_estimated_minutes', '30', '기본 예상 학습 시간'),
  ('require_approval', 'false', '신규 가입 승인 필요 여부')
ON CONFLICT (key) DO NOTHING;
```

---

## 4.1.3 Migration from v2.8.0

### Breaking Changes

| 변경 사항 | v2.8.0 | v3.0 | 마이그레이션 |
|-----------|--------|------|--------------|
| sections | JSONB in ojt_docs | `doc_sections` 테이블 | 데이터 분리 |
| quiz | JSONB in ojt_docs | `quiz_pools` 테이블 | 데이터 분리 |
| feedback | 없음 | `doc_feedback` 테이블 | 신규 |

### Migration Script

```sql
-- 1. doc_sections 마이그레이션
INSERT INTO public.doc_sections (doc_id, title, content, key_points, section_order)
SELECT
  d.id,
  s->>'title',
  s->>'content',
  ARRAY(SELECT jsonb_array_elements_text(s->'keyPoints')),
  (s->>'order')::INTEGER
FROM public.ojt_docs d,
     jsonb_array_elements(d.sections) WITH ORDINALITY AS t(s, idx)
WHERE d.sections IS NOT NULL AND jsonb_array_length(d.sections) > 0;

-- 2. quiz_pools 마이그레이션
INSERT INTO public.quiz_pools (doc_id, question, options, correct_index, explanation, difficulty, category)
SELECT
  d.id,
  q->>'question',
  q->'options',
  (q->>'correctIndex')::INTEGER,
  q->>'explanation',
  COALESCE(q->>'difficulty', 'medium'),
  COALESCE(q->>'category', 'comprehension')
FROM public.ojt_docs d,
     jsonb_array_elements(d.quiz) AS q
WHERE d.quiz IS NOT NULL AND jsonb_array_length(d.quiz) > 0;

-- 3. ojt_docs 메타데이터 업데이트
UPDATE public.ojt_docs d SET
  section_count = (SELECT COUNT(*) FROM public.doc_sections WHERE doc_id = d.id),
  quiz_count = (SELECT COUNT(*) FROM public.quiz_pools WHERE doc_id = d.id);
```

---

## 4.1.4 Design Decisions

### Why Normalize sections/quiz?

| 기준 | JSONB | 별도 테이블 |
|------|-------|------------|
| 조회 성능 | 전체 문서 로드 필요 | 개별 섹션 조회 가능 |
| 검색 | GIN 인덱스 필요 | B-tree 인덱스 |
| 업데이트 | 전체 JSONB 교체 | 개별 행 업데이트 |
| 통계 | 어려움 | SQL 집계 용이 |
| **선택** | - | ✅ 정규화 |

### Denormalized Fields

성능 최적화를 위해 일부 필드는 의도적으로 비정규화:

| 테이블 | 필드 | 이유 |
|--------|------|------|
| `users` | `email` | 자주 표시되는 필드, auth.users 조인 회피 |
| `ojt_docs` | `author_name` | 목록 조회 시 조인 회피 |
| `ojt_docs` | `section_count`, `quiz_count` | 통계 집계 회피 |
| `ojt_docs` | `view_count`, `avg_rating` | 실시간 집계 회피 |

---

## Related Documents

- [RLS Policies](./04-02-rls-policies.md)
- [Migration Strategy](./04-03-migrations.md)
- [API Specification](../06-api-spec.md)

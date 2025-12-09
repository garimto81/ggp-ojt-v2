# Supabase Schema Reference

**Last Updated**: 2025-12-09
**Project**: ggp-platform (cbvansmxutnogntbyswi)

---

## 테이블 스키마

### users

사용자 프로필 테이블. `auth.users`와 1:1 관계.

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mentee' CHECK (role IN ('admin', 'mentor', 'mentee')),
  department TEXT,                    -- 레거시 (TEXT) → department_id로 마이그레이션 예정
  department_id UUID REFERENCES departments(id),  -- 신규 FK (#178)
  auth_provider TEXT DEFAULT 'google' CHECK (auth_provider IN ('google', 'email')),
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### teams

팀 마스터 테이블. OJT 문서 분류용.

```sql
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### departments (신규 #178)

부서 마스터 테이블. 사용자 부서 관리용.

```sql
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- "개발팀", "디자인팀"
  slug TEXT NOT NULL UNIQUE,           -- "development", "design"
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  color_theme TEXT,                    -- UI 배지 색상 테마
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ojt_docs

OJT 교육 문서 테이블.

```sql
CREATE TABLE public.ojt_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  team TEXT NOT NULL,
  team_id UUID REFERENCES teams(id),
  step INTEGER NOT NULL DEFAULT 1,
  sections JSONB NOT NULL DEFAULT '[]',
  quiz JSONB NOT NULL DEFAULT '[]',
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  estimated_minutes INTEGER DEFAULT 30,
  source_type TEXT CHECK (source_type IN ('manual', 'url', 'pdf')),
  source_url TEXT,
  source_file TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### learning_records

학습 완료 기록 테이블.

```sql
CREATE TABLE public.learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_id UUID NOT NULL REFERENCES ojt_docs(id) ON DELETE CASCADE,
  score INTEGER,
  total_questions INTEGER DEFAULT 4,
  passed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_id)
);
```

### learning_progress

학습 진행 상태 테이블.

```sql
CREATE TABLE public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_id UUID NOT NULL REFERENCES ojt_docs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  current_section INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  quiz_attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_id)
);
```

### admin_settings

관리자 설정 Key-Value 저장소.

```sql
CREATE TABLE public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);
```

**주요 키**:
- `default_departments`: 기본 부서 목록 (레거시 → departments 테이블로 마이그레이션)
- `default_roles`: 기본 역할 목록

---

## RLS 정책 요약

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| **users** | 본인 OR Admin | 본인만 | 본인 OR Admin | - |
| **teams** | 모두 | Admin | Admin | Admin |
| **departments** | 모두 | Admin | Admin | Admin |
| **ojt_docs** | 모두 | Mentor/Admin | 작성자 OR Admin | 작성자 OR Admin |
| **learning_records** | 본인 OR Admin | 본인만 | 본인만 | - |
| **learning_progress** | 본인 OR Admin | 본인만 | 본인만 | - |
| **admin_settings** | 모두 | Admin | Admin | - |

---

## Helper 함수

```sql
-- RLS용 SECURITY DEFINER 함수
public.rls_get_role() → TEXT
public.rls_is_admin() → BOOLEAN
public.rls_is_mentor_or_admin() → BOOLEAN

-- 트리거 함수
public.update_updated_at() → TRIGGER
```

---

## 인덱스

| 테이블 | 인덱스 | 타입 |
|--------|--------|------|
| users | idx_users_role | B-tree |
| users | idx_users_status | B-tree |
| users | idx_users_department_id | B-tree |
| departments | idx_departments_slug | B-tree |
| departments | idx_departments_active | Partial (is_active=true) |
| departments | idx_departments_display_order | B-tree |
| ojt_docs | idx_ojt_docs_author | B-tree |
| ojt_docs | idx_ojt_docs_team | B-tree |
| learning_records | idx_learning_records_user | B-tree |
| learning_progress | idx_learning_progress_user | B-tree |

---

## 마이그레이션 히스토리

| 파일 | 날짜 | 설명 |
|------|------|------|
| `supabase_master.sql` | 2025-12-08 | 마스터 스키마 |
| `20251208_email_auth.sql` | 2025-12-08 | 이메일 인증 추가 |
| `20251209_departments_table.sql` | 2025-12-09 | departments 테이블 (#178) |

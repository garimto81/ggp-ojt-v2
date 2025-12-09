# 04-03. Migration Strategy

> **Parent**: [Master PRD](../00-master-prd.md) | **Version**: 3.0.0

## 4.3.1 Migration Approach

### Declarative Schema vs Migration Files

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| **Declarative** | Single source of truth | 롤백 어려움 | ✅ 신규 프로젝트 |
| **Migration Files** | 변경 이력 추적 | 파일 관리 복잡 | 기존 프로젝트 |

### File Structure

```
database/
├── init/                      # 신규 프로젝트용 (declarative)
│   ├── 01_schema.sql          # 테이블 정의
│   ├── 02_rls.sql             # RLS 정책
│   └── 03_seed.sql            # 초기 데이터
├── migrations/                # 기존 프로젝트용 (incremental)
│   ├── v2.8.0_baseline.sql    # 기준 스키마
│   ├── v3.0.0_sections.sql    # doc_sections 테이블
│   ├── v3.0.0_quiz_pools.sql  # quiz_pools 테이블
│   └── v3.0.0_feedback.sql    # doc_feedback 테이블
└── supabase_master.sql        # 통합 스키마 (참조용)
```

---

## 4.3.2 v2.8.0 → v3.0.0 Migration

### Step 1: Backup

```sql
-- 마이그레이션 전 백업 확인
-- Supabase Dashboard > Database > Backups

-- 또는 pg_dump 사용 (로컬)
-- pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### Step 2: New Tables

```sql
-- v3.0.0_sections.sql
-- doc_sections 테이블 생성
CREATE TABLE IF NOT EXISTS public.doc_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES public.ojt_docs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}',
  section_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_sections_doc ON public.doc_sections(doc_id);
CREATE INDEX IF NOT EXISTS idx_sections_order ON public.doc_sections(doc_id, section_order);

-- RLS
ALTER TABLE public.doc_sections ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_sections TO authenticated;
```

```sql
-- v3.0.0_quiz_pools.sql
-- quiz_pools 테이블 생성
CREATE TABLE IF NOT EXISTS public.quiz_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES public.ojt_docs(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_index INTEGER NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT DEFAULT 'comprehension' CHECK (category IN ('recall', 'comprehension', 'application')),
  attempt_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_quiz_doc ON public.quiz_pools(doc_id);
CREATE INDEX IF NOT EXISTS idx_quiz_difficulty ON public.quiz_pools(difficulty);

-- RLS
ALTER TABLE public.quiz_pools ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_pools TO authenticated;
```

### Step 3: Data Migration

```sql
-- v3.0.0_migrate_data.sql

-- 1. sections JSONB → doc_sections 테이블
INSERT INTO public.doc_sections (doc_id, title, content, key_points, section_order)
SELECT
  d.id AS doc_id,
  COALESCE(s->>'title', 'Untitled Section') AS title,
  COALESCE(s->>'content', '') AS content,
  COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(s->'keyPoints')),
    '{}'::TEXT[]
  ) AS key_points,
  (ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY idx) - 1)::INTEGER AS section_order
FROM public.ojt_docs d
CROSS JOIN LATERAL jsonb_array_elements(d.sections) WITH ORDINALITY AS t(s, idx)
WHERE d.sections IS NOT NULL
  AND jsonb_typeof(d.sections) = 'array'
  AND jsonb_array_length(d.sections) > 0
ON CONFLICT DO NOTHING;

-- 2. quiz JSONB → quiz_pools 테이블
INSERT INTO public.quiz_pools (doc_id, question, options, correct_index, explanation, difficulty, category)
SELECT
  d.id AS doc_id,
  q->>'question' AS question,
  COALESCE(q->'options', '[]'::JSONB) AS options,
  COALESCE((q->>'correctIndex')::INTEGER, 0) AS correct_index,
  q->>'explanation' AS explanation,
  COALESCE(q->>'difficulty', 'medium') AS difficulty,
  COALESCE(q->>'category', 'comprehension') AS category
FROM public.ojt_docs d
CROSS JOIN LATERAL jsonb_array_elements(d.quiz) AS q
WHERE d.quiz IS NOT NULL
  AND jsonb_typeof(d.quiz) = 'array'
  AND jsonb_array_length(d.quiz) > 0
ON CONFLICT DO NOTHING;

-- 3. ojt_docs 메타데이터 업데이트
UPDATE public.ojt_docs d SET
  section_count = (SELECT COUNT(*) FROM public.doc_sections WHERE doc_id = d.id),
  quiz_count = (SELECT COUNT(*) FROM public.quiz_pools WHERE doc_id = d.id)
WHERE EXISTS (SELECT 1 FROM public.doc_sections WHERE doc_id = d.id)
   OR EXISTS (SELECT 1 FROM public.quiz_pools WHERE doc_id = d.id);
```

### Step 4: Add New Columns to ojt_docs

```sql
-- v3.0.0_ojt_docs_columns.sql

-- 새 컬럼 추가 (IF NOT EXISTS 대신 DO 블록 사용)
DO $$
BEGIN
  -- section_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ojt_docs' AND column_name = 'section_count')
  THEN
    ALTER TABLE public.ojt_docs ADD COLUMN section_count INTEGER DEFAULT 0;
  END IF;

  -- quiz_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ojt_docs' AND column_name = 'quiz_count')
  THEN
    ALTER TABLE public.ojt_docs ADD COLUMN quiz_count INTEGER DEFAULT 0;
  END IF;

  -- description
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ojt_docs' AND column_name = 'description')
  THEN
    ALTER TABLE public.ojt_docs ADD COLUMN description TEXT;
  END IF;

  -- status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ojt_docs' AND column_name = 'status')
  THEN
    ALTER TABLE public.ojt_docs ADD COLUMN status TEXT DEFAULT 'published'
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;

  -- view_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ojt_docs' AND column_name = 'view_count')
  THEN
    ALTER TABLE public.ojt_docs ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;

  -- avg_rating
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ojt_docs' AND column_name = 'avg_rating')
  THEN
    ALTER TABLE public.ojt_docs ADD COLUMN avg_rating NUMERIC(2,1) DEFAULT 0;
  END IF;
END $$;
```

### Step 5: RLS Policies for New Tables

```sql
-- v3.0.0_rls_policies.sql

-- doc_sections RLS
CREATE POLICY "sections_select" ON public.doc_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ojt_docs d
      WHERE d.id = doc_id
      AND (d.status = 'published' OR d.author_id = auth.uid() OR public.rls_is_admin())
    )
  );

CREATE POLICY "sections_modify" ON public.doc_sections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ojt_docs d
      WHERE d.id = doc_id
      AND (d.author_id = auth.uid() OR public.rls_is_admin())
    )
  );

-- quiz_pools RLS
CREATE POLICY "quiz_select" ON public.quiz_pools
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ojt_docs d
      WHERE d.id = doc_id
      AND (d.status = 'published' OR d.author_id = auth.uid() OR public.rls_is_admin())
    )
  );

CREATE POLICY "quiz_modify" ON public.quiz_pools
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ojt_docs d
      WHERE d.id = doc_id
      AND (d.author_id = auth.uid() OR public.rls_is_admin())
    )
  );
```

---

## 4.3.3 Rollback Plan

### If Migration Fails

```sql
-- 1. 새 테이블 삭제
DROP TABLE IF EXISTS public.doc_sections CASCADE;
DROP TABLE IF EXISTS public.quiz_pools CASCADE;
DROP TABLE IF EXISTS public.doc_feedback CASCADE;

-- 2. 새 컬럼 삭제
ALTER TABLE public.ojt_docs DROP COLUMN IF EXISTS section_count;
ALTER TABLE public.ojt_docs DROP COLUMN IF EXISTS quiz_count;
ALTER TABLE public.ojt_docs DROP COLUMN IF EXISTS description;
ALTER TABLE public.ojt_docs DROP COLUMN IF EXISTS status;
ALTER TABLE public.ojt_docs DROP COLUMN IF EXISTS view_count;
ALTER TABLE public.ojt_docs DROP COLUMN IF EXISTS avg_rating;

-- 3. 기존 JSONB 컬럼은 그대로 유지 (sections, quiz)
```

---

## 4.3.4 Migration Checklist

### Pre-Migration

- [ ] Supabase 백업 확인
- [ ] 개발 환경에서 테스트 완료
- [ ] 다운타임 공지 (필요 시)

### During Migration

- [ ] Step 1: New tables 생성
- [ ] Step 2: New columns 추가
- [ ] Step 3: Data migration
- [ ] Step 4: RLS policies
- [ ] Step 5: Verification queries

### Post-Migration

- [ ] 데이터 정합성 확인
- [ ] 애플리케이션 테스트
- [ ] 에러 로그 모니터링
- [ ] (Optional) 기존 JSONB 컬럼 제거

### Verification Queries

```sql
-- 마이그레이션 검증
SELECT
  (SELECT COUNT(*) FROM public.doc_sections) AS sections_count,
  (SELECT COUNT(*) FROM public.quiz_pools) AS quiz_count,
  (SELECT COUNT(*) FROM public.ojt_docs WHERE section_count > 0) AS docs_with_sections,
  (SELECT COUNT(*) FROM public.ojt_docs WHERE quiz_count > 0) AS docs_with_quiz;

-- 데이터 정합성 확인
SELECT
  d.id,
  d.title,
  jsonb_array_length(d.sections) AS original_sections,
  d.section_count AS migrated_sections,
  jsonb_array_length(d.quiz) AS original_quiz,
  d.quiz_count AS migrated_quiz
FROM public.ojt_docs d
WHERE jsonb_array_length(d.sections) != COALESCE(d.section_count, 0)
   OR jsonb_array_length(d.quiz) != COALESCE(d.quiz_count, 0);
```

---

## Related Documents

- [Schema Design](./04-01-schema.md)
- [RLS Policies](./04-02-rls-policies.md)

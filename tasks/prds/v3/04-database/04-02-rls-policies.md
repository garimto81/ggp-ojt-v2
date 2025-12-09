# 04-02. Row Level Security (RLS) Policies

> **Parent**: [Master PRD](../00-master-prd.md) | **Version**: 3.0.0

## 4.2.1 Overview

Supabase RLS는 PostgreSQL의 Row Level Security를 활용하여 행 단위 접근 제어를 구현합니다.

### RLS 원칙

| 원칙 | 설명 |
|------|------|
| **Default Deny** | 명시적 정책 없으면 접근 차단 |
| **SECURITY DEFINER** | RLS 재귀 방지용 헬퍼 함수 |
| **Least Privilege** | 필요한 최소 권한만 부여 |
| **No Service Key** | 클라이언트에 service_role 노출 금지 |

---

## 4.2.2 Helper Functions

### SECURITY DEFINER Functions

```sql
-- 현재 사용자 역할 조회 (RLS 재귀 방지)
CREATE OR REPLACE FUNCTION public.rls_get_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER  -- RLS 우회
STABLE            -- 트랜잭션 내 결과 캐시
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- Admin 여부 확인
CREATE OR REPLACE FUNCTION public.rls_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
    false
  )
$$;

-- Mentor 또는 Admin 여부 확인
CREATE OR REPLACE FUNCTION public.rls_is_mentor_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('mentor', 'admin') FROM public.users WHERE id = auth.uid()),
    false
  )
$$;

-- Execute 권한 부여
GRANT EXECUTE ON FUNCTION public.rls_get_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_is_mentor_or_admin() TO authenticated;
```

---

## 4.2.3 Table Grants

```sql
-- Base permissions (RLS가 행 필터링)
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ojt_docs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_pools TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.learning_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.learning_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_feedback TO authenticated;
GRANT SELECT ON public.teams TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teams TO authenticated;  -- Admin RLS로 제한
GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;
```

---

## 4.2.4 RLS Policies by Table

### `users` Table

```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 OR Admin
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.rls_is_admin()
  );

-- INSERT: 본인 프로필만 (회원가입 시)
CREATE POLICY "users_insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: 본인 OR Admin
CREATE POLICY "users_update" ON public.users
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id
    OR public.rls_is_admin()
  )
  WITH CHECK (
    auth.uid() = id
    OR public.rls_is_admin()
  );
```

### `teams` Table

```sql
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- SELECT: 모든 인증 사용자
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Admin만
CREATE POLICY "teams_admin_all" ON public.teams
  FOR ALL TO authenticated
  USING (public.rls_is_admin())
  WITH CHECK (public.rls_is_admin());
```

### `ojt_docs` Table

```sql
ALTER TABLE public.ojt_docs ENABLE ROW LEVEL SECURITY;

-- SELECT: 모든 인증 사용자 (published 또는 본인 작성)
CREATE POLICY "docs_select" ON public.ojt_docs
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR author_id = auth.uid()
    OR public.rls_is_admin()
  );

-- INSERT: Mentor 또는 Admin
CREATE POLICY "docs_insert" ON public.ojt_docs
  FOR INSERT TO authenticated
  WITH CHECK (public.rls_is_mentor_or_admin());

-- UPDATE: 작성자 또는 Admin
CREATE POLICY "docs_update" ON public.ojt_docs
  FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.rls_is_admin()
  )
  WITH CHECK (
    author_id = auth.uid()
    OR public.rls_is_admin()
  );

-- DELETE: 작성자 또는 Admin
CREATE POLICY "docs_delete" ON public.ojt_docs
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.rls_is_admin()
  );
```

### `doc_sections` Table

```sql
ALTER TABLE public.doc_sections ENABLE ROW LEVEL SECURITY;

-- SELECT: 문서 조회 권한과 연동
CREATE POLICY "sections_select" ON public.doc_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ojt_docs d
      WHERE d.id = doc_id
      AND (d.status = 'published' OR d.author_id = auth.uid() OR public.rls_is_admin())
    )
  );

-- INSERT: 문서 작성자 또는 Admin
CREATE POLICY "sections_insert" ON public.doc_sections
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ojt_docs d
      WHERE d.id = doc_id
      AND (d.author_id = auth.uid() OR public.rls_is_admin())
    )
  );

-- UPDATE/DELETE: 문서 작성자 또는 Admin
CREATE POLICY "sections_modify" ON public.doc_sections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ojt_docs d
      WHERE d.id = doc_id
      AND (d.author_id = auth.uid() OR public.rls_is_admin())
    )
  );
```

### `quiz_pools` Table

```sql
ALTER TABLE public.quiz_pools ENABLE ROW LEVEL SECURITY;

-- SELECT: 문서 조회 권한과 연동
CREATE POLICY "quiz_select" ON public.quiz_pools
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ojt_docs d
      WHERE d.id = doc_id
      AND (d.status = 'published' OR d.author_id = auth.uid() OR public.rls_is_admin())
    )
  );

-- INSERT/UPDATE/DELETE: 문서 작성자 또는 Admin
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

### `learning_progress` Table

```sql
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 OR Admin
CREATE POLICY "progress_select" ON public.learning_progress
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.rls_is_admin()
  );

-- INSERT: 본인만
CREATE POLICY "progress_insert" ON public.learning_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: 본인만
CREATE POLICY "progress_update" ON public.learning_progress
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### `learning_records` Table

```sql
ALTER TABLE public.learning_records ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 OR Admin
CREATE POLICY "records_select" ON public.learning_records
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.rls_is_admin()
  );

-- INSERT: 본인만
CREATE POLICY "records_insert" ON public.learning_records
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: 본인만
CREATE POLICY "records_update" ON public.learning_records
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### `doc_feedback` Table

```sql
ALTER TABLE public.doc_feedback ENABLE ROW LEVEL SECURITY;

-- SELECT: 모든 인증 사용자 (익명화된 피드백)
CREATE POLICY "feedback_select" ON public.doc_feedback
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 본인 피드백만
CREATE POLICY "feedback_insert" ON public.doc_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE/DELETE: 본인 또는 Admin
CREATE POLICY "feedback_modify" ON public.doc_feedback
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.rls_is_admin()
  );
```

### `admin_settings` Table

```sql
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: 모든 인증 사용자
CREATE POLICY "settings_select" ON public.admin_settings
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE: Admin만
CREATE POLICY "settings_modify" ON public.admin_settings
  FOR ALL TO authenticated
  USING (public.rls_is_admin())
  WITH CHECK (public.rls_is_admin());
```

---

## 4.2.5 RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `users` | Self/Admin | Self | Self/Admin | - |
| `teams` | All | Admin | Admin | Admin |
| `ojt_docs` | Published/Author/Admin | Mentor/Admin | Author/Admin | Author/Admin |
| `doc_sections` | Via doc | Via doc author | Via doc author | Via doc author |
| `quiz_pools` | Via doc | Via doc author | Via doc author | Via doc author |
| `learning_progress` | Self/Admin | Self | Self | - |
| `learning_records` | Self/Admin | Self | Self | - |
| `doc_feedback` | All | Self | Self/Admin | Self/Admin |
| `admin_settings` | All | Admin | Admin | - |

---

## 4.2.6 Common RLS Issues

### Issue 1: RLS Infinite Recursion

```sql
-- ❌ 잘못된 예: users 조회 시 users 다시 조회
CREATE POLICY "bad_policy" ON public.ojt_docs
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- ✅ 올바른 예: SECURITY DEFINER 함수 사용
CREATE POLICY "good_policy" ON public.ojt_docs
  USING (public.rls_is_admin());
```

### Issue 2: Permission Denied before RLS

```sql
-- GRANT 없으면 RLS 검사 전에 실패
-- 반드시 GRANT 먼저 설정
GRANT SELECT ON public.users TO authenticated;
```

### Issue 3: Subquery Performance

```sql
-- ❌ 느림: 매 행마다 서브쿼리 실행
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ✅ 빠름: SECURITY DEFINER 함수 (결과 캐시됨)
USING (public.rls_is_admin());
```

---

## Related Documents

- [Schema Design](./04-01-schema.md)
- [Migration Strategy](./04-03-migrations.md)
- [Authentication](../03-features/03-04-auth.md)

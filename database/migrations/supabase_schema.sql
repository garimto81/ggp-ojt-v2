-- OJT Master Supabase Schema
-- Supabase SQL Editor에서 실행하세요

-- 1. users 테이블 (프로필 정보)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'mentee' CHECK (role IN ('admin', 'mentor', 'mentee')),
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ojt_docs 테이블 (OJT 자료)
CREATE TABLE IF NOT EXISTS ojt_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  team TEXT NOT NULL,
  step INTEGER NOT NULL DEFAULT 1,
  sections JSONB NOT NULL DEFAULT '[]',
  quiz JSONB NOT NULL DEFAULT '[]',
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  estimated_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. learning_records 테이블 (학습 기록)
CREATE TABLE IF NOT EXISTS learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  doc_id UUID REFERENCES ojt_docs(id) ON DELETE CASCADE,
  score INTEGER,
  total_questions INTEGER DEFAULT 4,
  passed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_id)
);

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ojt_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;

-- 4.1 Admin 체크 함수 (SECURITY DEFINER로 RLS 무한 재귀 방지)
-- 주의: 이 함수는 supabase_fix_rls.sql에도 정의되어 있습니다.
-- 새 프로젝트에서는 이 스키마 파일만 실행하면 됩니다.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.2 Mentor/Admin 체크 함수
CREATE OR REPLACE FUNCTION public.is_mentor_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role IN ('mentor', 'admin') FROM public.users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. users 테이블 정책
-- 누구나 자신의 프로필 조회 가능
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- 누구나 자신의 프로필 생성 가능
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 누구나 자신의 프로필 수정 가능 (role 필드는 변경 불가)
CREATE POLICY "Users can update own profile (except role)"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- 관리자는 모든 사용자 조회 가능 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (public.is_admin());

-- 관리자는 다른 사용자 역할 변경 가능
CREATE POLICY "Admins can update user roles"
  ON users FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. ojt_docs 테이블 정책
-- 로그인한 사용자는 모든 자료 조회 가능
CREATE POLICY "Authenticated users can view all docs"
  ON ojt_docs FOR SELECT
  TO authenticated
  USING (true);

-- 멘토와 관리자만 자료 생성 가능 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Mentors can create docs"
  ON ojt_docs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_mentor_or_admin());

-- 작성자만 자료 수정 가능
CREATE POLICY "Authors can update own docs"
  ON ojt_docs FOR UPDATE
  USING (author_id = auth.uid());

-- 작성자와 관리자만 자료 삭제 가능 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Authors and admins can delete docs"
  ON ojt_docs FOR DELETE
  USING (author_id = auth.uid() OR public.is_admin());

-- 7. learning_records 테이블 정책
-- 자신의 학습 기록만 조회 가능
CREATE POLICY "Users can view own learning records"
  ON learning_records FOR SELECT
  USING (user_id = auth.uid());

-- 자신의 학습 기록만 생성 가능
CREATE POLICY "Users can insert own learning records"
  ON learning_records FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 자신의 학습 기록만 수정 가능
CREATE POLICY "Users can update own learning records"
  ON learning_records FOR UPDATE
  USING (user_id = auth.uid());

-- 관리자는 모든 학습 기록 조회 가능 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Admins can view all learning records"
  ON learning_records FOR SELECT
  USING (public.is_admin());

-- 8. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_ojt_docs_team ON ojt_docs(team);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_author ON ojt_docs(author_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_user ON learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_doc ON learning_records(doc_id);

-- 9. 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ojt_docs_updated_at
  BEFORE UPDATE ON ojt_docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

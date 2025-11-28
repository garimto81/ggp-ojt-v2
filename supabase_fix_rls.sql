-- OJT Master RLS 수정 스크립트
-- 문제: users 테이블 RLS 정책의 재귀적 자기 참조로 500 에러 발생
-- 해결: SECURITY DEFINER 함수로 RLS 우회하여 역할 확인

-- =============================================
-- 1. 기존 모든 정책 삭제 (중복 방지)
-- =============================================

-- users 테이블 - 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view profiles" ON users;

-- ojt_docs 테이블 - 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Mentors can create docs" ON ojt_docs;
DROP POLICY IF EXISTS "Authors and admins can delete docs" ON ojt_docs;

-- learning_records 테이블 - 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all learning records" ON learning_records;
DROP POLICY IF EXISTS "Users can view own learning records" ON learning_records;
DROP POLICY IF EXISTS "Users can view learning records" ON learning_records;

-- =============================================
-- 2. SECURITY DEFINER 함수 생성 (RLS 우회)
-- =============================================

-- 현재 사용자의 역할 조회 (RLS 우회)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- 현재 사용자가 관리자인지 확인
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 현재 사용자가 멘토 또는 관리자인지 확인
CREATE OR REPLACE FUNCTION is_mentor_or_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('mentor', 'admin')
  );
$$;

-- =============================================
-- 3. 수정된 RLS 정책 생성
-- =============================================

-- [users 테이블]
-- 자신의 프로필 조회 + 관리자는 모두 조회 (단일 정책으로 통합)
CREATE POLICY "Users can view profiles"
  ON users FOR SELECT
  USING (
    auth.uid() = id OR is_admin()
  );

-- [ojt_docs 테이블]
-- 멘토/관리자만 자료 생성 가능 (함수 사용)
CREATE POLICY "Mentors can create docs"
  ON ojt_docs FOR INSERT
  TO authenticated
  WITH CHECK (is_mentor_or_admin());

-- 작성자와 관리자만 자료 삭제 가능 (함수 사용)
CREATE POLICY "Authors and admins can delete docs"
  ON ojt_docs FOR DELETE
  USING (
    author_id = auth.uid() OR is_admin()
  );

-- [learning_records 테이블]
-- 자신의 학습 기록 + 관리자는 모두 조회 (단일 정책으로 통합)
CREATE POLICY "Users can view learning records"
  ON learning_records FOR SELECT
  USING (
    user_id = auth.uid() OR is_admin()
  );

-- =============================================
-- 4. 정책 확인 쿼리 (실행 후 확인용)
-- =============================================

-- SELECT * FROM pg_policies WHERE tablename IN ('users', 'ojt_docs', 'learning_records');

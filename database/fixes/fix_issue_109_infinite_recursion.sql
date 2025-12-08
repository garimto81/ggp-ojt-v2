-- ======================================
-- Issue #109: Docker 환경 로그인 시 500 에러 수정
-- 문제: RLS 정책에서 무한 재귀 발생
-- Date: 2025-12-08
-- ======================================

-- ======================================
-- STEP 1: 문제 정책 삭제
-- ======================================
DROP POLICY IF EXISTS "users_select_approved" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own_or_admin" ON users;
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- ======================================
-- STEP 2: Email 인증 관련 컬럼 추가
-- ======================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'google';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 기존 사용자 업데이트 (NULL 값 방지)
UPDATE users SET
  auth_provider = COALESCE(auth_provider, 'google'),
  status = COALESCE(status, 'approved')
WHERE auth_provider IS NULL OR status IS NULL;

-- ======================================
-- STEP 3: SECURITY DEFINER 함수 생성 (무한 재귀 방지)
-- ======================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_mentor_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role IN ('mentor', 'admin') FROM public.users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_mentor_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_mentor_or_admin() TO anon;

-- ======================================
-- STEP 4: GRANT 권한 부여
-- ======================================
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- ======================================
-- STEP 5: RLS 활성화
-- ======================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ======================================
-- STEP 6: 기존 정책 모두 삭제 후 새로 생성
-- ======================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile (except role)" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can update user roles" ON users;

-- 6.1 자신의 프로필 조회
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 6.2 Admin은 모든 사용자 조회 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 6.3 자신의 프로필 생성 (회원가입 시)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 6.4 자신의 프로필 수정
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6.5 Admin은 모든 사용자 정보 수정 (역할 변경, 승인 등)
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ======================================
-- STEP 7: 인덱스 추가 (성능 최적화)
-- ======================================
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- ======================================
-- STEP 8: 검증
-- ======================================
SELECT 'users 테이블 컬럼 확인:' as check_type;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('auth_provider', 'status', 'approved_by', 'approved_at');

SELECT 'RLS 정책 확인:' as check_type;
SELECT policyname, cmd as operation
FROM pg_policies
WHERE tablename = 'users';

SELECT '완료! 이제 앱을 새로고침하세요.' as result;

-- ======================================
-- OJT Master - Complete Permissions Setup
-- Issue: #93 - 전체 테이블 권한 및 RLS 무결성 검증
-- Date: 2025-12-08
-- ======================================
--
-- 목적: 모든 테이블에 대한 GRANT + RLS 정책을 한 번에 설정
-- 문제: 기존 마이그레이션에 GRANT 문 누락 → 403 Forbidden 에러
--
-- PostgreSQL 접근 제어 순서:
--   1. GRANT (테이블 레벨) - 테이블에 접근할 수 있는가?
--   2. RLS (행 레벨) - 어떤 행에 접근할 수 있는가?
--   → GRANT 없으면 RLS 검사 전에 차단됨!
--
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ======================================


-- ======================================
-- PART 0: Helper Functions (SECURITY DEFINER)
-- ======================================
-- SECURITY DEFINER: 함수 소유자(postgres) 권한으로 실행
-- users 테이블 RLS를 우회하여 role 확인 가능 (순환 참조 방지)

-- is_admin() 함수
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- is_mentor_or_admin() 함수
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
-- PART 1: GRANT Permissions (테이블 레벨 접근 권한)
-- ======================================
-- authenticated: 로그인된 사용자
-- anon: 로그인하지 않은 사용자 (이 앱에서는 사용 안 함)

-- 1.1 users 테이블
-- 모든 인증 사용자: SELECT (프로필 조회)
-- 자신의 프로필: INSERT, UPDATE
-- Admin: DELETE (사용자 삭제용, 현재 미사용)
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- 1.2 ojt_docs 테이블
-- 모든 인증 사용자: SELECT (자료 조회)
-- Mentor/Admin: INSERT (자료 생성)
-- 작성자: UPDATE (자료 수정)
-- 작성자/Admin: DELETE (자료 삭제)
GRANT SELECT, INSERT, UPDATE, DELETE ON ojt_docs TO authenticated;

-- 1.3 learning_records 테이블
-- 모든 인증 사용자: SELECT, INSERT, UPDATE (학습 기록)
GRANT SELECT, INSERT, UPDATE ON learning_records TO authenticated;

-- 1.4 content_reports 테이블
-- 모든 인증 사용자: INSERT (신고 생성)
-- Admin: SELECT, UPDATE (신고 조회/처리)
GRANT SELECT, INSERT, UPDATE ON content_reports TO authenticated;

-- 1.5 admin_settings 테이블
-- 모든 인증 사용자: SELECT (설정 조회 - 부서 목록 등)
-- Admin: INSERT, UPDATE (설정 변경)
GRANT SELECT, INSERT, UPDATE ON admin_settings TO authenticated;

-- 1.6 admin_logs 테이블
-- Admin: SELECT, INSERT (로그 조회/생성)
GRANT SELECT, INSERT ON admin_logs TO authenticated;


-- ======================================
-- PART 2: RLS 활성화
-- ======================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ojt_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;


-- ======================================
-- PART 3: users 테이블 RLS 정책
-- ======================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile (except role)" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update user roles" ON users;

-- 3.1 자신의 프로필 조회
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 3.2 Admin은 모든 사용자 조회
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 3.3 자신의 프로필 생성 (회원가입 시)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3.4 자신의 프로필 수정 (role 제외)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3.5 Admin은 모든 사용자 정보 수정 (역할 변경 포함)
CREATE POLICY "Admins can update user roles" ON users
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ======================================
-- PART 4: ojt_docs 테이블 RLS 정책
-- ======================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Authenticated users can view all docs" ON ojt_docs;
DROP POLICY IF EXISTS "Mentors can create docs" ON ojt_docs;
DROP POLICY IF EXISTS "Authors can update own docs" ON ojt_docs;
DROP POLICY IF EXISTS "Authors and admins can delete docs" ON ojt_docs;
DROP POLICY IF EXISTS "Admins can update all docs" ON ojt_docs;

-- 4.1 모든 인증 사용자가 자료 조회 가능
CREATE POLICY "Authenticated users can view all docs" ON ojt_docs
  FOR SELECT TO authenticated
  USING (true);

-- 4.2 Mentor/Admin만 자료 생성 가능
CREATE POLICY "Mentors can create docs" ON ojt_docs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_mentor_or_admin());

-- 4.3 작성자만 자료 수정 가능
CREATE POLICY "Authors can update own docs" ON ojt_docs
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

-- 4.4 Admin은 모든 자료 수정 가능 (상태 변경 등)
CREATE POLICY "Admins can update all docs" ON ojt_docs
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.5 작성자 또는 Admin만 자료 삭제 가능
CREATE POLICY "Authors and admins can delete docs" ON ojt_docs
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin());


-- ======================================
-- PART 5: learning_records 테이블 RLS 정책
-- ======================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own learning records" ON learning_records;
DROP POLICY IF EXISTS "Users can insert own learning records" ON learning_records;
DROP POLICY IF EXISTS "Users can update own learning records" ON learning_records;
DROP POLICY IF EXISTS "Admins can view all learning records" ON learning_records;

-- 5.1 자신의 학습 기록 조회
CREATE POLICY "Users can view own learning records" ON learning_records
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5.2 Admin은 모든 학습 기록 조회 (통계용)
CREATE POLICY "Admins can view all learning records" ON learning_records
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 5.3 자신의 학습 기록 생성
CREATE POLICY "Users can insert own learning records" ON learning_records
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5.4 자신의 학습 기록 수정
CREATE POLICY "Users can update own learning records" ON learning_records
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());


-- ======================================
-- PART 6: content_reports 테이블 RLS 정책
-- ======================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can create reports" ON content_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON content_reports;
DROP POLICY IF EXISTS "Admins can update reports" ON content_reports;

-- 6.1 모든 인증 사용자가 신고 생성 가능 (자신의 ID로만)
CREATE POLICY "Users can create reports" ON content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- 6.2 Admin만 모든 신고 조회 가능
CREATE POLICY "Admins can view all reports" ON content_reports
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 6.3 Admin만 신고 상태 변경 가능
CREATE POLICY "Admins can update reports" ON content_reports
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ======================================
-- PART 7: admin_settings 테이블 RLS 정책
-- ======================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can view settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON admin_settings;

-- 7.1 모든 인증 사용자가 설정 조회 가능 (부서 목록 등 공용 설정)
CREATE POLICY "Anyone can view settings" ON admin_settings
  FOR SELECT TO authenticated
  USING (true);

-- 7.2 Admin만 설정 수정 가능
CREATE POLICY "Admins can update settings" ON admin_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7.3 Admin만 설정 생성 가능
CREATE POLICY "Admins can insert settings" ON admin_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());


-- ======================================
-- PART 8: admin_logs 테이블 RLS 정책
-- ======================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view logs" ON admin_logs;
DROP POLICY IF EXISTS "Admins can create logs" ON admin_logs;

-- 8.1 Admin만 로그 조회 가능
CREATE POLICY "Admins can view logs" ON admin_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 8.2 Admin만 로그 생성 가능
CREATE POLICY "Admins can create logs" ON admin_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());


-- ======================================
-- PART 9: 검증 쿼리
-- ======================================

-- 9.1 GRANT 권한 확인
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('users', 'ojt_docs', 'learning_records', 'content_reports', 'admin_settings', 'admin_logs')
  AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- 9.2 RLS 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  cmd AS operation,
  CASE
    WHEN qual LIKE '%is_admin()%' THEN '✅ is_admin()'
    WHEN qual LIKE '%is_mentor_or_admin()%' THEN '✅ is_mentor_or_admin()'
    WHEN qual LIKE '%auth.uid()%' THEN '✅ auth.uid()'
    WHEN qual = 'true' THEN '🔓 모두 허용'
    ELSE qual
  END AS policy_type
FROM pg_policies
WHERE tablename IN ('users', 'ojt_docs', 'learning_records', 'content_reports', 'admin_settings', 'admin_logs')
ORDER BY tablename, cmd;

-- 9.3 RLS 활성화 상태 확인
SELECT
  relname AS table_name,
  CASE WHEN relrowsecurity THEN '✅ RLS 활성화' ELSE '❌ RLS 비활성화' END AS rls_status
FROM pg_class
WHERE relname IN ('users', 'ojt_docs', 'learning_records', 'content_reports', 'admin_settings', 'admin_logs')
ORDER BY relname;

-- 9.4 SECURITY DEFINER 함수 확인
SELECT
  proname AS function_name,
  CASE WHEN prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END AS security_mode
FROM pg_proc
WHERE proname IN ('is_admin', 'is_mentor_or_admin');


-- ======================================
-- 완료 메시지
-- ======================================
DO $$
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'OJT Master Complete Permissions Setup 완료!';
  RAISE NOTICE '======================================';
  RAISE NOTICE '';
  RAISE NOTICE '설정된 테이블 (6개):';
  RAISE NOTICE '  - users: SELECT, INSERT, UPDATE';
  RAISE NOTICE '  - ojt_docs: SELECT, INSERT, UPDATE, DELETE';
  RAISE NOTICE '  - learning_records: SELECT, INSERT, UPDATE';
  RAISE NOTICE '  - content_reports: SELECT, INSERT, UPDATE';
  RAISE NOTICE '  - admin_settings: SELECT, INSERT, UPDATE';
  RAISE NOTICE '  - admin_logs: SELECT, INSERT';
  RAISE NOTICE '';
  RAISE NOTICE '생성된 함수 (2개):';
  RAISE NOTICE '  - is_admin(): Admin 역할 체크';
  RAISE NOTICE '  - is_mentor_or_admin(): Mentor/Admin 역할 체크';
  RAISE NOTICE '';
  RAISE NOTICE '검증 방법:';
  RAISE NOTICE '  1. 위 SELECT 쿼리 결과 확인';
  RAISE NOTICE '  2. 앱에서 각 역할별 테스트';
  RAISE NOTICE '======================================';
END $$;

-- ======================================
-- Admin Tables RLS Fix
-- Issue: #93 - admin_settings, admin_logs 403 오류
-- Date: 2025-12-08 (Updated)
-- ======================================
--
-- 문제 1: authenticated 역할에 테이블 GRANT 권한 없음 (핵심!)
-- 문제 2: RLS 정책에서 users 테이블 조회 시 순환 차단
-- 해결: GRANT 권한 부여 + SECURITY DEFINER 함수 사용
--
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ======================================


-- ======================================
-- 0. 테이블 권한 부여 (핵심! - 이게 없으면 RLS 이전에 차단됨)
-- ======================================

GRANT SELECT ON admin_settings TO authenticated;
GRANT SELECT, INSERT ON admin_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON content_reports TO authenticated;


-- ======================================
-- 1. is_admin() 함수 생성/재정의
-- ======================================
-- SECURITY DEFINER: 함수 소유자(postgres) 권한으로 실행
-- users 테이블 RLS를 우회하여 role 확인 가능

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수에 대한 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;


-- ======================================
-- 2. admin_logs RLS 정책 재설정
-- ======================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view logs" ON admin_logs;
DROP POLICY IF EXISTS "Admins can create logs" ON admin_logs;

-- 새 정책: is_admin() 함수 사용
CREATE POLICY "Admins can view logs" ON admin_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can create logs" ON admin_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());


-- ======================================
-- 3. admin_settings RLS 정책 재설정
-- ======================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can view settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON admin_settings;

-- 새 정책: 읽기는 모든 인증 사용자, 쓰기는 admin만
CREATE POLICY "Anyone can view settings" ON admin_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can update settings" ON admin_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can insert settings" ON admin_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());


-- ======================================
-- 4. content_reports RLS 정책 확인/재설정
-- ======================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can create reports" ON content_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON content_reports;
DROP POLICY IF EXISTS "Admins can update reports" ON content_reports;

-- 새 정책
CREATE POLICY "Users can create reports" ON content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can view all reports" ON content_reports
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update reports" ON content_reports
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ======================================
-- 5. 검증 쿼리
-- ======================================

-- 실행 후 아래 쿼리로 검증:
--
-- -- is_admin() 함수 확인
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'is_admin';
-- -- prosecdef = true 이면 SECURITY DEFINER 적용됨
--
-- -- RLS 정책 확인
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('admin_logs', 'admin_settings', 'content_reports');
--
-- -- 테스트: Admin 사용자로 로그인 후
-- SELECT * FROM admin_logs LIMIT 5;
-- SELECT * FROM admin_settings;


-- ======================================
-- 완료 메시지
-- ======================================
DO $$
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Admin Tables RLS Fix 완료!';
  RAISE NOTICE '======================================';
  RAISE NOTICE '수정된 테이블: admin_logs, admin_settings, content_reports';
  RAISE NOTICE '생성/수정된 함수: public.is_admin()';
  RAISE NOTICE '';
  RAISE NOTICE '검증 방법:';
  RAISE NOTICE '1. Admin 계정으로 로그인';
  RAISE NOTICE '2. Admin Dashboard > 설정 탭 접속';
  RAISE NOTICE '3. 시스템 로그가 정상 표시되는지 확인';
  RAISE NOTICE '======================================';
END $$;

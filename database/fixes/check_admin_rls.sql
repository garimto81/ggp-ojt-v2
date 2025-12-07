-- ======================================
-- Admin Tables RLS 정책 확인 쿼리
-- Supabase SQL Editor에서 실행
-- ======================================

-- 1. is_admin() 함수 존재 및 SECURITY DEFINER 확인
SELECT
  proname AS function_name,
  CASE WHEN prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END AS security_mode,
  pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'is_admin';

-- 결과 해석:
-- security_mode가 '✅ SECURITY DEFINER'여야 정상
-- 결과가 없으면 함수가 생성되지 않은 것

-- ======================================

-- 2. admin_settings, admin_logs, content_reports RLS 정책 목록
SELECT
  schemaname AS schema,
  tablename AS table_name,
  policyname AS policy_name,
  cmd AS operation,
  CASE
    WHEN qual LIKE '%is_admin()%' THEN '✅ is_admin() 사용'
    WHEN qual LIKE '%role%admin%' THEN '⚠️ 직접 서브쿼리 (문제 가능)'
    WHEN qual = 'true' THEN '🔓 모두 허용'
    ELSE qual
  END AS policy_check
FROM pg_policies
WHERE tablename IN ('admin_settings', 'admin_logs', 'content_reports')
ORDER BY tablename, cmd;

-- 결과 해석:
-- admin_settings SELECT: '🔓 모두 허용' (정상)
-- admin_logs SELECT/INSERT: '✅ is_admin() 사용' (정상)
-- content_reports SELECT/UPDATE: '✅ is_admin() 사용' (정상)

-- ======================================

-- 3. RLS 활성화 상태 확인
SELECT
  relname AS table_name,
  CASE WHEN relrowsecurity THEN '✅ RLS 활성화' ELSE '❌ RLS 비활성화' END AS rls_status,
  CASE WHEN relforcerowsecurity THEN '🔒 Force RLS' ELSE '🔓 No Force' END AS force_rls
FROM pg_class
WHERE relname IN ('admin_settings', 'admin_logs', 'content_reports')
ORDER BY relname;

-- 결과 해석:
-- 모든 테이블이 '✅ RLS 활성화'여야 정상

-- ======================================

-- 4. 현재 사용자 정보 확인
SELECT
  auth.uid() AS current_user_id,
  (SELECT role FROM users WHERE id = auth.uid()) AS current_role,
  public.is_admin() AS is_admin_result;

-- 결과 해석:
-- current_role = 'admin' 이고 is_admin_result = true 여야 Admin 접근 가능
-- is_admin_result가 null이면 is_admin() 함수가 없는 것

-- ======================================

-- 5. 실제 데이터 접근 테스트
-- (RLS 정책이 적용된 상태에서 실행)

-- admin_settings 조회 테스트
SELECT 'admin_settings' AS table_name, COUNT(*) AS row_count
FROM admin_settings;

-- admin_logs 조회 테스트 (Admin만 가능)
SELECT 'admin_logs' AS table_name, COUNT(*) AS row_count
FROM admin_logs;

-- 결과 해석:
-- 오류 없이 row_count가 반환되면 정상
-- 'permission denied' 오류 시 RLS 정책 문제

-- ======================================

-- 6. 정책 상세 조회 (디버깅용)
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual AS using_clause,
  with_check
FROM pg_policies
WHERE tablename IN ('admin_settings', 'admin_logs', 'content_reports')
ORDER BY tablename, policyname;

-- ======================================
-- 예상 정상 결과 요약:
-- ======================================
--
-- | 테이블          | 정책                    | 조건              |
-- |-----------------|-------------------------|-------------------|
-- | admin_settings  | Anyone can view settings| true (모두 조회)  |
-- | admin_settings  | Admins can update       | is_admin()        |
-- | admin_settings  | Admins can insert       | is_admin()        |
-- | admin_logs      | Admins can view logs    | is_admin()        |
-- | admin_logs      | Admins can create logs  | is_admin()        |
-- | content_reports | Users can create reports| reporter_id=uid() |
-- | content_reports | Admins can view all     | is_admin()        |
-- | content_reports | Admins can update       | is_admin()        |
--
-- ======================================

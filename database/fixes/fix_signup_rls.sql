-- ======================================
-- 회원가입 RLS 정책 수정
-- Issue: 신규 가입 시 500 에러 (Database error saving new user)
-- Date: 2025-12-08
-- ======================================

-- 문제 원인:
-- 1. 회원가입 시 users 테이블에 INSERT 하려면 authenticated 권한 필요
-- 2. Supabase Auth 계정 생성 직후 users INSERT 시점에 RLS 정책 충돌
-- 3. SECURITY DEFINER 함수들이 users 테이블을 조회하지만, 신규 사용자는 아직 없음

-- ======================================
-- STEP 1: 기존 문제 정책 삭제
-- ======================================
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- ======================================
-- STEP 2: 신규 회원가입 INSERT 정책 (수정)
-- ======================================
-- 인증된 사용자는 자신의 id로 프로필 생성 가능
-- WITH CHECK만 사용 (INSERT는 USING 불필요)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ======================================
-- STEP 3: Service Role 우회 옵션 (선택)
-- ======================================
-- Supabase Edge Function이나 Service Role Key를 사용하면 RLS 우회 가능
-- 현재는 클라이언트에서 직접 INSERT하므로 RLS 정책으로 해결

-- ======================================
-- STEP 4: 테이블 권한 재확인
-- ======================================
-- authenticated 역할에 INSERT 권한 부여 (이미 있어도 무해)
GRANT INSERT ON users TO authenticated;

-- ======================================
-- STEP 5: 검증 쿼리
-- ======================================
SELECT 'RLS 정책 확인:' as check_type;
SELECT policyname, cmd as operation, qual as using_expr, with_check
FROM pg_policies
WHERE tablename = 'users';

SELECT 'GRANT 권한 확인:' as check_type;
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'users' AND grantee = 'authenticated';

-- ======================================
-- 디버깅 팁
-- ======================================
-- 500 에러가 계속 발생하면:
-- 1. Supabase Dashboard > Authentication > Users에서 해당 이메일 확인
-- 2. Supabase Dashboard > Table Editor > users에서 레코드 확인
-- 3. Edge Function logs 확인
--
-- RLS 정책이 아닌 트리거 문제일 수 있음:
-- SELECT tgname, tgrelid::regclass, tgtype, tgenabled
-- FROM pg_trigger
-- WHERE tgrelid = 'users'::regclass;

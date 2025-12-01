-- Fix for role update RLS policy
-- 문제: Admin이 다른 사용자의 역할을 변경할 때 RLS가 차단함
-- 원인: 두 UPDATE 정책이 충돌 (자기 프로필 수정 정책 vs Admin 역할 변경 정책)

-- 1. 기존 충돌하는 정책 삭제
DROP POLICY IF EXISTS "Users can update own profile (except role)" ON users;
DROP POLICY IF EXISTS "Admins can update user roles" ON users;

-- 2. 새 정책: 사용자는 자기 프로필만 수정 (role 제외)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- role 필드가 변경되지 않았는지 확인
    role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- 3. 새 정책: Admin은 모든 사용자의 role만 변경 가능
CREATE POLICY "Admins can update any user role"
  ON users FOR UPDATE
  USING (
    public.is_admin() AND
    auth.uid() != id  -- 자기 자신이 아닌 다른 사용자만
  )
  WITH CHECK (public.is_admin());

-- 4. 확인: 정책 목록 조회
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'UPDATE';

-- ============================================
-- OJT Master: Admin 문서 수정 권한 추가
-- ============================================
-- 요구사항:
--   - Admin: 모든 문서 열람/수정/삭제 가능
--   - Mentor: 자신이 제작한 문서만 열람/수정/삭제 가능
--   - Mentee: 모든 문서 열람만 가능

-- ============================================
-- 1. 기존 UPDATE 정책 삭제
-- ============================================

DROP POLICY IF EXISTS "Authors can update own docs" ON ojt_docs;

-- ============================================
-- 2. 새로운 UPDATE 정책 생성
-- ============================================
-- 작성자(Mentor) 또는 관리자(Admin)가 수정 가능

CREATE POLICY "Authors and admins can update docs"
  ON ojt_docs FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() OR public.is_admin()
  )
  WITH CHECK (
    author_id = auth.uid() OR public.is_admin()
  );

-- ============================================
-- 3. 확인 쿼리
-- ============================================

-- 정책 확인
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'ojt_docs';

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ojt_docs UPDATE 정책 수정 완료';
  RAISE NOTICE '- 기존: Authors can update own docs (작성자만)';
  RAISE NOTICE '- 변경: Authors and admins can update docs (작성자 + Admin)';
  RAISE NOTICE '============================================';
END $$;

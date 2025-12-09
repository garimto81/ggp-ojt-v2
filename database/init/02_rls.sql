-- ============================================================
-- OJT Master - Row Level Security (RLS) Policies
-- Issue #114: Local-Only Docker Deployment
-- ============================================================
--
-- 목적: 테이블별 RLS 정책 설정 (Supabase 호환)
-- 실행: Docker entrypoint에서 자동 실행됨
--
-- ============================================================

-- ============================================================
-- Helper Functions (SECURITY DEFINER)
-- ============================================================
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
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_mentor_or_admin() TO authenticated, anon;

-- ============================================================
-- RLS 활성화
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ojt_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- users 테이블 정책
-- ============================================================
-- 누구나 자신의 프로필 조회 가능
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- 누구나 자신의 프로필 생성 가능
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 누구나 자신의 프로필 수정 가능 (role/status 필드는 변경 불가)
CREATE POLICY "Users can update own profile (except role/status)"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.users WHERE id = auth.uid()) AND
    status = (SELECT status FROM public.users WHERE id = auth.uid())
  );

-- 관리자는 모든 사용자 조회 가능
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

-- 관리자는 다른 사용자 역할/상태 변경 가능
CREATE POLICY "Admins can update user roles and status"
  ON public.users FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- teams 테이블 정책
-- ============================================================
-- 로그인한 사용자는 모든 팀 조회 가능
CREATE POLICY "Authenticated users can view all teams"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

-- 관리자만 팀 생성/수정/삭제 가능
CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- ojt_docs 테이블 정책
-- ============================================================
-- 로그인한 사용자는 모든 자료 조회 가능
CREATE POLICY "Authenticated users can view all docs"
  ON public.ojt_docs FOR SELECT
  TO authenticated
  USING (true);

-- 멘토와 관리자만 자료 생성 가능
CREATE POLICY "Mentors can create docs"
  ON public.ojt_docs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_mentor_or_admin());

-- 작성자만 자료 수정 가능
CREATE POLICY "Authors can update own docs"
  ON public.ojt_docs FOR UPDATE
  USING (author_id = auth.uid());

-- 작성자와 관리자만 자료 삭제 가능
CREATE POLICY "Authors and admins can delete docs"
  ON public.ojt_docs FOR DELETE
  USING (author_id = auth.uid() OR public.is_admin());

-- ============================================================
-- learning_records 테이블 정책
-- ============================================================
-- 자신의 학습 기록만 조회 가능
CREATE POLICY "Users can view own learning records"
  ON public.learning_records FOR SELECT
  USING (user_id = auth.uid());

-- 자신의 학습 기록만 생성 가능
CREATE POLICY "Users can insert own learning records"
  ON public.learning_records FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 자신의 학습 기록만 수정 가능
CREATE POLICY "Users can update own learning records"
  ON public.learning_records FOR UPDATE
  USING (user_id = auth.uid());

-- 관리자는 모든 학습 기록 조회 가능
CREATE POLICY "Admins can view all learning records"
  ON public.learning_records FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- learning_progress 테이블 정책
-- ============================================================
-- 자신의 학습 진행률만 조회 가능
CREATE POLICY "Users can view own learning progress"
  ON public.learning_progress FOR SELECT
  USING (user_id = auth.uid());

-- 자신의 학습 진행률만 생성/수정 가능
CREATE POLICY "Users can manage own learning progress"
  ON public.learning_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 관리자는 모든 학습 진행률 조회 가능
CREATE POLICY "Admins can view all learning progress"
  ON public.learning_progress FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- content_reports 테이블 정책
-- ============================================================
-- 신고자는 자신의 신고만 조회 가능
CREATE POLICY "Users can view own reports"
  ON public.content_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- 로그인한 사용자는 신고 생성 가능
CREATE POLICY "Authenticated users can create reports"
  ON public.content_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- 관리자는 모든 신고 조회/수정 가능
CREATE POLICY "Admins can manage all reports"
  ON public.content_reports FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- admin_settings 테이블 정책
-- ============================================================
-- 로그인한 사용자는 모든 설정 조회 가능
CREATE POLICY "Authenticated users can view settings"
  ON public.admin_settings FOR SELECT
  TO authenticated
  USING (true);

-- 관리자만 설정 생성/수정 가능
CREATE POLICY "Admins can manage settings"
  ON public.admin_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- admin_logs 테이블 정책
-- ============================================================
-- 관리자만 로그 조회 가능
CREATE POLICY "Admins can view logs"
  ON public.admin_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 관리자만 로그 생성 가능
CREATE POLICY "Admins can insert logs"
  ON public.admin_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ============================================================
-- 완료 메시지
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE 'RLS policies applied successfully!';
  RAISE NOTICE 'Security model:';
  RAISE NOTICE '  - users: Own profile + Admin all';
  RAISE NOTICE '  - ojt_docs: All read, Mentor+ write, Author update';
  RAISE NOTICE '  - learning_*: Own records + Admin all';
  RAISE NOTICE '  - admin_*: Admin only';
END
$$;

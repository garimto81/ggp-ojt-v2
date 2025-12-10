-- Migration: audit_logs RLS 및 CHECK 제약조건 수정
-- Date: 2025-12-10
-- Issues: #192, #193

-- ============================================================
-- #192: audit_logs SELECT RLS 정책 추가 (Admin만 조회 가능)
-- ============================================================

-- 기존 정책 확인 후 추가 (IF NOT EXISTS 미지원으로 DO 블록 사용)
DO $$
BEGIN
  -- 정책이 없으면 생성
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs'
    AND policyname = 'Admin can view audit logs'
  ) THEN
    CREATE POLICY "Admin can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.rls_is_admin());
  END IF;
END $$;

-- ============================================================
-- #193: audit_logs CHECK 제약조건에 SETTINGS_UPDATE 추가
-- ============================================================

-- 기존 CHECK 제약조건 삭제
ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_event_type_check;

-- 새 CHECK 제약조건 추가 (SETTINGS_UPDATE 포함)
ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_event_type_check CHECK (
  event_type = ANY (ARRAY[
    'ROLE_CHANGE'::text,
    'LOGIN'::text,
    'LOGOUT'::text,
    'DOC_CREATE'::text,
    'DOC_UPDATE'::text,
    'DOC_DELETE'::text,
    'SECURITY_ALERT'::text,
    'SETTINGS_UPDATE'::text
  ])
);

-- ============================================================
-- 확인용 쿼리 (실행 후 삭제 가능)
-- ============================================================
-- SELECT * FROM pg_policies WHERE tablename = 'audit_logs';
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'audit_logs'::regclass;

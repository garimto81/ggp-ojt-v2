-- ============================================
-- Departments 마이그레이션 롤백 스크립트
-- 목적: 마이그레이션 문제 발생 시 원복
-- 파일: database/migrations/20251209_departments_table_rollback.sql
-- ============================================

-- Phase 1: users.department_id 컬럼 제거
ALTER TABLE public.users DROP COLUMN IF EXISTS department_id;

-- Phase 2: 인덱스 제거
DROP INDEX IF EXISTS idx_users_department_id;
DROP INDEX IF EXISTS idx_departments_slug;
DROP INDEX IF EXISTS idx_departments_active;
DROP INDEX IF EXISTS idx_departments_display_order;

-- Phase 3: departments 테이블 RLS 정책 제거
DROP POLICY IF EXISTS "departments_select_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_update_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_policy" ON public.departments;

-- Phase 4: departments 테이블 트리거 제거
DROP TRIGGER IF EXISTS departments_updated_at ON public.departments;

-- Phase 5: departments 테이블 삭제
DROP TABLE IF EXISTS public.departments CASCADE;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Rollback completed';
  RAISE NOTICE 'departments 테이블이 제거되었습니다.';
  RAISE NOTICE 'users.department 컬럼은 그대로 유지됩니다.';
  RAISE NOTICE '============================================';
END $$;

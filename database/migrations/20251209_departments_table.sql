-- ============================================
-- OJT Master: departments 테이블 마이그레이션
-- 목적: admin_settings.default_departments + users.department 정규화
-- 파일: database/migrations/20251209_departments_table.sql
-- 이슈: #178
-- 날짜: 2025-12-09
-- ============================================

-- ============================================
-- Phase 1: departments 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- "개발팀", "디자인팀" 등
  slug TEXT NOT NULL UNIQUE,           -- "development", "design" (URL용)
  description TEXT,                    -- 부서 설명 (선택)
  display_order INTEGER DEFAULT 0,     -- 표시 순서
  is_active BOOLEAN DEFAULT true,      -- 활성화 여부
  color_theme TEXT,                    -- 색상 테마 키 ("indigo", "pink" 등)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 테이블 코멘트
COMMENT ON TABLE public.departments IS 'OJT 부서 마스터 테이블';
COMMENT ON COLUMN public.departments.slug IS 'URL 친화적 식별자 (영문 소문자)';
COMMENT ON COLUMN public.departments.display_order IS '드롭다운 및 목록 표시 순서';
COMMENT ON COLUMN public.departments.color_theme IS 'UI 배지 색상 테마 (constants.js 연동)';

-- ============================================
-- Phase 2: 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_departments_slug ON public.departments(slug);
CREATE INDEX IF NOT EXISTS idx_departments_active ON public.departments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_departments_display_order ON public.departments(display_order);

-- ============================================
-- Phase 3: RLS 설정
-- ============================================

-- 테이블 권한 부여
GRANT ALL ON public.departments TO authenticated;

-- RLS 활성화
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (재실행 시 충돌 방지)
DROP POLICY IF EXISTS "departments_select_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_update_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_policy" ON public.departments;

-- SELECT 정책: 인증된 모든 사용자 조회 가능
CREATE POLICY "departments_select_policy"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

-- INSERT 정책: Admin만 가능
CREATE POLICY "departments_insert_policy"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE 정책: Admin만 가능
CREATE POLICY "departments_update_policy"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE 정책: Admin만 가능
CREATE POLICY "departments_delete_policy"
  ON public.departments FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- Phase 4: updated_at 트리거
-- ============================================

CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Phase 5: 기존 데이터 마이그레이션
-- ============================================

-- 5.1 admin_settings에서 기본 부서 목록 추출 및 삽입
DO $$
DECLARE
  dept_array JSONB;
  dept_name TEXT;
  dept_order INTEGER := 0;
  slug_map JSONB := '{
    "개발팀": "development",
    "디자인팀": "design",
    "기획팀": "planning",
    "마케팅팀": "marketing",
    "운영팀": "operations",
    "인사팀": "hr"
  }'::JSONB;
  color_map JSONB := '{
    "개발팀": "indigo",
    "디자인팀": "pink",
    "기획팀": "purple",
    "마케팅팀": "orange",
    "운영팀": "teal",
    "인사팀": "cyan"
  }'::JSONB;
BEGIN
  -- admin_settings에서 부서 목록 가져오기
  SELECT value INTO dept_array
  FROM admin_settings
  WHERE key = 'default_departments';

  -- 배열이 존재하면 각 부서 삽입
  IF dept_array IS NOT NULL AND jsonb_typeof(dept_array) = 'array' THEN
    FOR dept_name IN SELECT jsonb_array_elements_text(dept_array)
    LOOP
      dept_order := dept_order + 1;
      INSERT INTO public.departments (name, slug, display_order, color_theme)
      VALUES (
        dept_name,
        COALESCE(
          slug_map ->> dept_name,
          LOWER(REGEXP_REPLACE(REGEXP_REPLACE(dept_name, '[^a-zA-Z0-9가-힣\s]', '', 'g'), '\s+', '_', 'g'))
        ),
        dept_order,
        color_map ->> dept_name
      )
      ON CONFLICT (name) DO NOTHING;
    END LOOP;
  END IF;

  RAISE NOTICE 'Phase 5.1: admin_settings에서 % 개의 부서 마이그레이션 완료', dept_order;
END $$;

-- 5.2 users.department에서 누락된 부서 추가 (admin_settings에 없는 경우)
INSERT INTO public.departments (name, slug, display_order)
SELECT DISTINCT
  department as name,
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(department, '[^a-zA-Z0-9가-힣\s]', '', 'g'), '\s+', '_', 'g')) as slug,
  100 + ROW_NUMBER() OVER (ORDER BY department) as display_order
FROM public.users
WHERE department IS NOT NULL
  AND department != ''
  AND department NOT IN (SELECT name FROM public.departments)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Phase 6: users 테이블에 department_id FK 추가
-- ============================================

-- 6.1 department_id 컬럼 추가 (기존 department 컬럼 유지 - 하위호환)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 6.2 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_department_id ON public.users(department_id);

-- 6.3 기존 department 데이터 → department_id 매핑
UPDATE public.users u
SET department_id = d.id
FROM public.departments d
WHERE u.department = d.name
  AND u.department_id IS NULL;

-- ============================================
-- Phase 7: 마이그레이션 검증
-- ============================================

DO $$
DECLARE
  total_users INTEGER;
  migrated_users INTEGER;
  pending_users INTEGER;
  department_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.users;
  SELECT COUNT(*) INTO migrated_users FROM public.users WHERE department_id IS NOT NULL;
  SELECT COUNT(*) INTO pending_users FROM public.users WHERE department_id IS NULL AND department IS NOT NULL;
  SELECT COUNT(*) INTO department_count FROM public.departments;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Departments 마이그레이션 결과';
  RAISE NOTICE '============================================';
  RAISE NOTICE '생성된 부서 수: %', department_count;
  RAISE NOTICE '전체 사용자 수: %', total_users;
  RAISE NOTICE '마이그레이션 완료 (department_id 설정): %', migrated_users;
  RAISE NOTICE '마이그레이션 대기 (department 있지만 department_id 없음): %', pending_users;
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- (주의) Phase 8: 레거시 컬럼 제거 - 프론트엔드 마이그레이션 완료 후 실행
-- ============================================
-- Step 1: 프론트엔드에서 department_id 사용으로 전환 완료 후:
--   ALTER TABLE public.users DROP COLUMN department;
-- Step 2: admin_settings에서 default_departments 키 제거:
--   DELETE FROM admin_settings WHERE key = 'default_departments';

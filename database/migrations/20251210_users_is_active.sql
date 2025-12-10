-- Migration: Add is_active column to users table
-- Issue: #196
-- Date: 2025-12-10
-- Description: 코드에서 사용자 활성화/비활성화 토글에 is_active 필드 사용하나 DB에 컬럼 없음

-- ============================================
-- 1. Add is_active column to users table
-- ============================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Comment for documentation
COMMENT ON COLUMN public.users.is_active IS '사용자 활성화 상태 (비활성화된 사용자는 로그인 불가)';

-- ============================================
-- 2. Create index for active users
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_is_active
ON public.users(is_active)
WHERE is_active = true;

-- ============================================
-- 3. Verify migration
-- ============================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name = 'is_active';

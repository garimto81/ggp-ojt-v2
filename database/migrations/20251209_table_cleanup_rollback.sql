-- ============================================
-- 테이블 정리 롤백 스크립트
-- 목적: admin_logs, content_reports 테이블 복원
-- 파일: database/migrations/20251209_table_cleanup_rollback.sql
-- 날짜: 2025-12-09
-- ============================================

-- ============================================
-- Phase 1: admin_logs 테이블 복원
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 복원
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

-- 권한 부여
GRANT ALL ON public.admin_logs TO authenticated;

RAISE NOTICE '[ROLLBACK] admin_logs 테이블이 복원되었습니다.';

-- ============================================
-- Phase 2: content_reports 테이블 복원
-- ============================================
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID REFERENCES ojt_docs(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 인덱스 복원
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);

-- 권한 부여
GRANT ALL ON public.content_reports TO authenticated;

RAISE NOTICE '[ROLLBACK] content_reports 테이블이 복원되었습니다.';

-- ============================================
-- Phase 3: 검증
-- ============================================
SELECT 'Rollback complete' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

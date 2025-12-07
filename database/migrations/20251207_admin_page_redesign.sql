-- ======================================
-- Admin Page Redesign Migration
-- PRD: 0005-admin-page-redesign
-- Date: 2025-12-07
-- ======================================

-- ======================================
-- 1. ojt_docs 테이블 확장
-- ======================================
ALTER TABLE ojt_docs
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published'
    CHECK (status IN ('draft', 'review', 'published', 'hidden'));

ALTER TABLE ojt_docs
  ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;

ALTER TABLE ojt_docs
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

ALTER TABLE ojt_docs
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);

-- 기존 데이터: 모두 published로 설정
UPDATE ojt_docs SET status = 'published' WHERE status IS NULL;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ojt_docs_status ON ojt_docs(status);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_report_count ON ojt_docs(report_count) WHERE report_count > 0;


-- ======================================
-- 2. users 테이블 확장 (활동 추적)
-- ======================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);


-- ======================================
-- 3. content_reports 테이블 (신고 시스템)
-- ======================================
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES ojt_docs(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'outdated', 'duplicate', 'spam', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_content_reports_doc_id ON content_reports(doc_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status) WHERE status = 'pending';


-- ======================================
-- 4. admin_settings 테이블 (시스템 설정)
-- ======================================
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

-- 기본 설정값 삽입
INSERT INTO admin_settings (key, value) VALUES
  ('default_departments', '["개발팀", "디자인팀", "기획팀", "마케팅팀", "운영팀", "인사팀"]'),
  ('default_role', '"mentee"'),
  ('quiz_pass_score', '70'),
  ('auto_hide_report_count', '3')
ON CONFLICT (key) DO NOTHING;


-- ======================================
-- 5. admin_logs 테이블 (활동 로그)
-- ======================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'doc', 'report', 'setting')),
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);


-- ======================================
-- 6. RLS 정책 - content_reports
-- ======================================
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 신고 생성 가능
DROP POLICY IF EXISTS "Users can create reports" ON content_reports;
CREATE POLICY "Users can create reports" ON content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Admin만 모든 신고 조회 가능
DROP POLICY IF EXISTS "Admins can view all reports" ON content_reports;
CREATE POLICY "Admins can view all reports" ON content_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin만 신고 처리 가능
DROP POLICY IF EXISTS "Admins can update reports" ON content_reports;
CREATE POLICY "Admins can update reports" ON content_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );


-- ======================================
-- 7. RLS 정책 - admin_settings
-- ======================================
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 설정 조회 가능
DROP POLICY IF EXISTS "Anyone can view settings" ON admin_settings;
CREATE POLICY "Anyone can view settings" ON admin_settings
  FOR SELECT TO authenticated
  USING (true);

-- Admin만 설정 수정 가능
DROP POLICY IF EXISTS "Admins can update settings" ON admin_settings;
CREATE POLICY "Admins can update settings" ON admin_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );


-- ======================================
-- 8. RLS 정책 - admin_logs
-- ======================================
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Admin만 로그 조회 가능
DROP POLICY IF EXISTS "Admins can view logs" ON admin_logs;
CREATE POLICY "Admins can view logs" ON admin_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin만 로그 생성 가능
DROP POLICY IF EXISTS "Admins can create logs" ON admin_logs;
CREATE POLICY "Admins can create logs" ON admin_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );


-- ======================================
-- 9. 트리거: 신고 수 자동 업데이트
-- ======================================
CREATE OR REPLACE FUNCTION update_doc_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ojt_docs SET report_count = report_count + 1 WHERE id = NEW.doc_id;
    -- 3건 이상 신고 시 자동 숨김
    UPDATE ojt_docs
    SET status = 'hidden'
    WHERE id = NEW.doc_id
      AND report_count >= 3
      AND status = 'published';
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ojt_docs SET report_count = GREATEST(report_count - 1, 0) WHERE id = OLD.doc_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_report_count ON content_reports;
CREATE TRIGGER tr_update_report_count
AFTER INSERT OR DELETE ON content_reports
FOR EACH ROW EXECUTE FUNCTION update_doc_report_count();


-- ======================================
-- 완료 메시지
-- ======================================
-- 마이그레이션 완료: Admin Page Redesign
-- 생성된 테이블: content_reports, admin_settings, admin_logs
-- 확장된 테이블: ojt_docs (status, report_count), users (last_active_at)

-- ============================================
-- OJT Master - PostgreSQL Initialization Script
-- Docker 로컬 개발 환경용 (Supabase RLS 제외)
-- ============================================

-- ============================================
-- 1. Extension 활성화
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. users 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'mentee' CHECK (role IN ('admin', 'mentor', 'mentee')),
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. teams 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. ojt_docs 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS ojt_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  team TEXT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  step INTEGER NOT NULL DEFAULT 1,
  sections JSONB NOT NULL DEFAULT '[]',
  quiz JSONB NOT NULL DEFAULT '[]',
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  estimated_minutes INTEGER DEFAULT 30,
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('url', 'pdf', 'manual')),
  source_url TEXT,
  source_file TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. learning_records 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  doc_id UUID REFERENCES ojt_docs(id) ON DELETE CASCADE,
  score INTEGER,
  total_questions INTEGER DEFAULT 4,
  passed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_id)
);

-- ============================================
-- 6. learning_progress 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_id UUID NOT NULL REFERENCES ojt_docs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'passed')),
  started_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  total_time_seconds INTEGER DEFAULT 0,
  current_section INTEGER DEFAULT 0,
  sections_completed INTEGER DEFAULT 0,
  quiz_attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_id)
);

-- ============================================
-- 7. 인덱스 생성
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ojt_docs_team ON ojt_docs(team);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_team_id ON ojt_docs(team_id);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_author ON ojt_docs(author_id);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_source_type ON ojt_docs(source_type);
CREATE INDEX IF NOT EXISTS idx_learning_records_user ON learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_doc ON learning_records(doc_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_doc ON learning_progress(doc_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_status ON learning_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active) WHERE is_active = true;

-- ============================================
-- 8. 트리거: updated_at 자동 갱신
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ojt_docs_updated_at
  BEFORE UPDATE ON ojt_docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER learning_progress_updated_at
  BEFORE UPDATE ON learning_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 9. 샘플 데이터 (개발용)
-- ============================================

-- 샘플 사용자
INSERT INTO users (id, email, name, role, department) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@example.com', '관리자', 'admin', 'IT'),
  ('00000000-0000-0000-0000-000000000002', 'mentor@example.com', '멘토', 'mentor', '개발팀'),
  ('00000000-0000-0000-0000-000000000003', 'mentee@example.com', '신입사원', 'mentee', '개발팀')
ON CONFLICT (id) DO NOTHING;

-- 샘플 팀
INSERT INTO teams (name, slug, display_order) VALUES
  ('개발팀', 'dev', 1),
  ('마케팅팀', 'marketing', 2),
  ('인사팀', 'hr', 3)
ON CONFLICT (name) DO NOTHING;

-- 샘플 OJT 문서
INSERT INTO ojt_docs (id, title, team, step, sections, quiz, author_id, author_name, estimated_minutes) VALUES
  (
    '00000000-0000-0000-0000-000000000101',
    '개발팀 온보딩 가이드',
    '개발팀',
    1,
    '[{"title": "환영합니다", "content": "<p>개발팀에 오신 것을 환영합니다!</p>"}]'::jsonb,
    '[{"question": "개발팀의 주요 업무는?", "options": ["코딩", "마케팅", "영업", "회계"], "correct": 0}]'::jsonb,
    '00000000-0000-0000-0000-000000000002',
    '멘토',
    30
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 10. 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'OJT Master Docker PostgreSQL 초기화 완료';
  RAISE NOTICE '- users: % rows', (SELECT COUNT(*) FROM users);
  RAISE NOTICE '- teams: % rows', (SELECT COUNT(*) FROM teams);
  RAISE NOTICE '- ojt_docs: % rows', (SELECT COUNT(*) FROM ojt_docs);
  RAISE NOTICE '============================================';
END $$;

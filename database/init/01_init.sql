-- ============================================================
-- OJT Master - PostgreSQL Initialization Script
-- Issue #114: Local-Only Docker Deployment
-- ============================================================
--
-- 목적: Self-hosted PostgreSQL 초기화
-- 실행: Docker entrypoint에서 자동 실행됨
--
-- ============================================================

-- 확장 프로그램 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 인증 스키마 (Supabase 호환)
-- ============================================================
-- auth 스키마는 별도 auth 서비스 대신 간단한 테이블로 대체
CREATE SCHEMA IF NOT EXISTS auth;

-- auth.users 테이블 (Supabase auth.users 호환)
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  is_super_admin BOOLEAN DEFAULT false
);

-- auth 함수: auth.uid() (현재 사용자 ID)
-- PostgREST는 JWT에서 user_id를 추출하여 current_setting으로 저장
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- auth 함수: auth.email() (현재 사용자 email)
CREATE OR REPLACE FUNCTION auth.email()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claim.email', true), '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- auth 함수: auth.role() (현재 사용자 role - JWT claim)
CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claim.role', true), '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'anon';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- PostgreSQL Roles (PostgREST 용)
-- ============================================================
-- anon: 익명 사용자 (로그인 전)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END
$$;

-- authenticated: 인증된 사용자
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

-- 권한 부여
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- auth 함수 실행 권한
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.email() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated;

-- ============================================================
-- Public 스키마 테이블 생성
-- ============================================================

-- 1. users 테이블 (프로필 정보)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'mentee' CHECK (role IN ('admin', 'mentor', 'mentee')),
  department TEXT,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. teams 테이블 (팀 마스터)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ojt_docs 테이블 (OJT 자료)
CREATE TABLE IF NOT EXISTS public.ojt_docs (
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
  source_type TEXT CHECK (source_type IN ('direct', 'url', 'pdf')),
  source_url TEXT,
  source_file TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. learning_records 테이블 (학습 기록)
CREATE TABLE IF NOT EXISTS public.learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  doc_id UUID REFERENCES ojt_docs(id) ON DELETE CASCADE,
  score INTEGER,
  total_questions INTEGER DEFAULT 4,
  passed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_id)
);

-- 5. learning_progress 테이블 (학습 진행률)
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  doc_id UUID REFERENCES ojt_docs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  current_section INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  quiz_attempts INTEGER DEFAULT 0,
  best_score INTEGER,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_id)
);

-- 6. content_reports 테이블 (콘텐츠 신고)
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

-- 7. admin_settings 테이블 (관리자 설정)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. admin_logs 테이블 (관리자 로그)
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 인덱스 생성 (성능 최적화)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_team ON ojt_docs(team);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_team_step ON ojt_docs(team, step);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_author ON ojt_docs(author_id);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_updated ON ojt_docs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_records_user ON learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_doc ON learning_records(doc_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_user_doc ON learning_records(user_id, doc_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_doc ON learning_progress(doc_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_doc ON learning_progress(user_id, doc_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

-- ============================================================
-- 트리거: updated_at 자동 갱신
-- ============================================================
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

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ojt_docs_updated_at
  BEFORE UPDATE ON ojt_docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER learning_progress_updated_at
  BEFORE UPDATE ON learning_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 테이블 권한 부여
-- ============================================================
-- anon (로그인 전): auth.users만 조회 가능
GRANT SELECT ON auth.users TO anon;

-- authenticated (로그인 후): 모든 테이블 접근 가능 (RLS로 제어)
GRANT ALL ON auth.users TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.teams TO authenticated;
GRANT ALL ON public.ojt_docs TO authenticated;
GRANT ALL ON public.learning_records TO authenticated;
GRANT ALL ON public.learning_progress TO authenticated;
GRANT ALL ON public.content_reports TO authenticated;
GRANT ALL ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_logs TO authenticated;

-- ============================================================
-- 완료 메시지
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE 'OJT Master database initialization completed successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run 02_auth.sql for authentication setup';
  RAISE NOTICE '  2. Run 03_rls.sql for Row Level Security policies';
END
$$;

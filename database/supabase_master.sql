-- ============================================================
-- OJT Master - Supabase Master Schema
-- Date: 2025-12-08
-- Version: 1.0.0
--
-- Single source of truth for all Supabase database setup.
-- Run this file once on a fresh Supabase project.
-- ============================================================

-- ============================================================
-- PHASE 1: CLEANUP (Safe to run multiple times)
-- ============================================================

-- Disable RLS temporarily for cleanup
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ojt_docs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.learning_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.learning_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (idempotent)
DO $$
DECLARE
    tbl TEXT;
    pol RECORD;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['users', 'ojt_docs', 'learning_records', 'learning_progress', 'teams'])
    LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
        END LOOP;
    END LOOP;
END $$;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.rls_get_role() CASCADE;
DROP FUNCTION IF EXISTS public.rls_get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.rls_is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.rls_is_mentor_or_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_mentor_or_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;

-- Drop auth triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;


-- ============================================================
-- PHASE 2: TABLES
-- ============================================================

-- Teams table (must be created before ojt_docs for FK)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'mentee' CHECK (role IN ('admin', 'mentor', 'mentee')),
    department TEXT,
    auth_provider TEXT DEFAULT 'google' CHECK (auth_provider IN ('google', 'email')),
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OJT Documents table
CREATE TABLE IF NOT EXISTS public.ojt_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    team TEXT NOT NULL,
    team_id UUID REFERENCES public.teams(id),
    step INTEGER NOT NULL DEFAULT 1,
    sections JSONB NOT NULL DEFAULT '[]',
    quiz JSONB NOT NULL DEFAULT '[]',
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    author_name TEXT,
    estimated_minutes INTEGER DEFAULT 30,
    source_type TEXT CHECK (source_type IN ('manual', 'url', 'pdf')),
    source_url TEXT,
    source_file TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning records table
CREATE TABLE IF NOT EXISTS public.learning_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL REFERENCES public.ojt_docs(id) ON DELETE CASCADE,
    score INTEGER,
    total_questions INTEGER DEFAULT 4,
    passed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, doc_id)
);

-- Learning progress table
CREATE TABLE IF NOT EXISTS public.learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL REFERENCES public.ojt_docs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    current_section INTEGER DEFAULT 0,
    total_time_seconds INTEGER DEFAULT 0,
    quiz_attempts INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, doc_id)
);


-- ============================================================
-- PHASE 3: SECURITY DEFINER FUNCTIONS
-- These functions bypass RLS to prevent circular reference
-- ============================================================

CREATE OR REPLACE FUNCTION public.rls_get_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.rls_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
        false
    )
$$;

CREATE OR REPLACE FUNCTION public.rls_is_mentor_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role IN ('mentor', 'admin') FROM public.users WHERE id = auth.uid()),
        false
    )
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.rls_get_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_is_mentor_or_admin() TO authenticated;


-- ============================================================
-- PHASE 4: TABLE GRANTS
-- Grant base permissions (RLS will filter rows)
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ojt_docs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.learning_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.learning_progress TO authenticated;
GRANT SELECT ON public.teams TO authenticated;

-- Admin can manage teams
GRANT INSERT, UPDATE, DELETE ON public.teams TO authenticated;


-- ============================================================
-- PHASE 5: ENABLE RLS
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ojt_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- PHASE 6: RLS POLICIES - users TABLE
-- ============================================================

-- SELECT: Own profile OR admin can see all
CREATE POLICY "users_select" ON public.users
    FOR SELECT TO authenticated
    USING (
        auth.uid() = id
        OR public.rls_is_admin()
    );

-- INSERT: Only own profile (for signup)
CREATE POLICY "users_insert" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- UPDATE: Own profile OR admin can update all
CREATE POLICY "users_update" ON public.users
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = id
        OR public.rls_is_admin()
    )
    WITH CHECK (
        auth.uid() = id
        OR public.rls_is_admin()
    );


-- ============================================================
-- PHASE 7: RLS POLICIES - ojt_docs TABLE
-- ============================================================

-- SELECT: All authenticated users can read all docs
CREATE POLICY "docs_select" ON public.ojt_docs
    FOR SELECT TO authenticated
    USING (true);

-- INSERT: Mentor or Admin can create
CREATE POLICY "docs_insert" ON public.ojt_docs
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_is_mentor_or_admin());

-- UPDATE: Author or Admin can update
CREATE POLICY "docs_update" ON public.ojt_docs
    FOR UPDATE TO authenticated
    USING (
        author_id = auth.uid()
        OR public.rls_is_admin()
    )
    WITH CHECK (
        author_id = auth.uid()
        OR public.rls_is_admin()
    );

-- DELETE: Author or Admin can delete
CREATE POLICY "docs_delete" ON public.ojt_docs
    FOR DELETE TO authenticated
    USING (
        author_id = auth.uid()
        OR public.rls_is_admin()
    );


-- ============================================================
-- PHASE 8: RLS POLICIES - learning_records TABLE
-- ============================================================

-- SELECT: Own records OR admin can see all
CREATE POLICY "records_select" ON public.learning_records
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.rls_is_admin()
    );

-- INSERT: Own records only
CREATE POLICY "records_insert" ON public.learning_records
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Own records only
CREATE POLICY "records_update" ON public.learning_records
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ============================================================
-- PHASE 9: RLS POLICIES - learning_progress TABLE
-- ============================================================

-- SELECT: Own progress OR admin can see all
CREATE POLICY "progress_select" ON public.learning_progress
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.rls_is_admin()
    );

-- INSERT: Own progress only
CREATE POLICY "progress_insert" ON public.learning_progress
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Own progress only
CREATE POLICY "progress_update" ON public.learning_progress
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ============================================================
-- PHASE 10: RLS POLICIES - teams TABLE
-- ============================================================

-- SELECT: All authenticated can read teams
CREATE POLICY "teams_select" ON public.teams
    FOR SELECT TO authenticated
    USING (true);

-- INSERT/UPDATE/DELETE: Admin only
CREATE POLICY "teams_insert" ON public.teams
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_is_admin());

CREATE POLICY "teams_update" ON public.teams
    FOR UPDATE TO authenticated
    USING (public.rls_is_admin())
    WITH CHECK (public.rls_is_admin());

CREATE POLICY "teams_delete" ON public.teams
    FOR DELETE TO authenticated
    USING (public.rls_is_admin());


-- ============================================================
-- PHASE 11: INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_author ON public.ojt_docs(author_id);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_team ON public.ojt_docs(team);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_step ON public.ojt_docs(step);
CREATE INDEX IF NOT EXISTS idx_learning_records_user ON public.learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_doc ON public.learning_records(doc_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON public.learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_doc ON public.learning_progress(doc_id);


-- ============================================================
-- PHASE 12: SEED DATA (Optional)
-- ============================================================

-- Insert default teams if not exists
INSERT INTO public.teams (name, slug, display_order, is_active) VALUES
    ('Development', 'development', 1, true),
    ('Design', 'design', 2, true),
    ('Planning', 'planning', 3, true),
    ('Marketing', 'marketing', 4, true),
    ('Common', 'common', 5, true)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- PHASE 13: VERIFICATION
-- ============================================================

DO $$
DECLARE
    func_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Check functions
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname LIKE 'rls_%';

    RAISE NOTICE 'RLS helper functions created: %', func_count;

    -- Check policies per table
    FOR policy_count IN
        SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users'
    LOOP
        RAISE NOTICE 'Policies on users: %', policy_count;
    END LOOP;

    FOR policy_count IN
        SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ojt_docs'
    LOOP
        RAISE NOTICE 'Policies on ojt_docs: %', policy_count;
    END LOOP;

    FOR policy_count IN
        SELECT COUNT(*) FROM pg_policies WHERE tablename = 'learning_records'
    LOOP
        RAISE NOTICE 'Policies on learning_records: %', policy_count;
    END LOOP;

    FOR policy_count IN
        SELECT COUNT(*) FROM pg_policies WHERE tablename = 'learning_progress'
    LOOP
        RAISE NOTICE 'Policies on learning_progress: %', policy_count;
    END LOOP;

    FOR policy_count IN
        SELECT COUNT(*) FROM pg_policies WHERE tablename = 'teams'
    LOOP
        RAISE NOTICE 'Policies on teams: %', policy_count;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Supabase Master Schema setup complete!';
    RAISE NOTICE '========================================';
END $$;

-- Show summary
SELECT 'Setup Complete!' as status;
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

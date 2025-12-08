-- ============================================================
-- OJT Master - RLS Complete Redesign
-- Date: 2025-12-08
--
-- Purpose: Fix all RLS issues from the ground up
-- ============================================================

-- ============================================================
-- PHASE 1: COMPLETE CLEANUP
-- Remove all existing policies and functions to start fresh
-- ============================================================

-- Disable RLS temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ojt_docs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on users table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL existing policies on ojt_docs table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'ojt_docs'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.ojt_docs', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL existing policies on learning_records table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'learning_records'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.learning_records', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL existing policies on learning_progress table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'learning_progress'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.learning_progress', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL existing policies on teams table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'teams'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.teams', pol.policyname);
    END LOOP;
END $$;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_mentor_or_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;

-- Drop any auth triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;


-- ============================================================
-- PHASE 2: SCHEMA SETUP
-- Ensure all required columns exist
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'google';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Update existing users (ensure no NULL values)
UPDATE public.users SET
    auth_provider = COALESCE(auth_provider, 'google'),
    status = COALESCE(status, 'approved')
WHERE auth_provider IS NULL OR status IS NULL;


-- ============================================================
-- PHASE 3: SECURITY DEFINER FUNCTIONS
-- These functions bypass RLS to prevent circular reference
-- ============================================================

-- Function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.rls_get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- Function to check if current user is admin
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

-- Function to check if current user is mentor or admin
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
GRANT EXECUTE ON FUNCTION public.rls_get_my_role() TO authenticated;
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
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT TO authenticated
    USING (
        auth.uid() = id
        OR public.rls_is_admin()
    );

-- INSERT: Only own profile (for signup)
CREATE POLICY "users_insert_policy" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- UPDATE: Own profile OR admin can update all
CREATE POLICY "users_update_policy" ON public.users
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
CREATE POLICY "docs_select_policy" ON public.ojt_docs
    FOR SELECT TO authenticated
    USING (true);

-- INSERT: Mentor or Admin can create
CREATE POLICY "docs_insert_policy" ON public.ojt_docs
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_is_mentor_or_admin());

-- UPDATE: Author or Admin can update
CREATE POLICY "docs_update_policy" ON public.ojt_docs
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
CREATE POLICY "docs_delete_policy" ON public.ojt_docs
    FOR DELETE TO authenticated
    USING (
        author_id = auth.uid()
        OR public.rls_is_admin()
    );


-- ============================================================
-- PHASE 8: RLS POLICIES - learning_records TABLE
-- ============================================================

-- SELECT: Own records OR admin can see all
CREATE POLICY "records_select_policy" ON public.learning_records
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.rls_is_admin()
    );

-- INSERT: Own records only
CREATE POLICY "records_insert_policy" ON public.learning_records
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Own records only
CREATE POLICY "records_update_policy" ON public.learning_records
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ============================================================
-- PHASE 9: RLS POLICIES - learning_progress TABLE
-- ============================================================

-- SELECT: Own progress OR admin can see all
CREATE POLICY "progress_select_policy" ON public.learning_progress
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.rls_is_admin()
    );

-- INSERT: Own progress only
CREATE POLICY "progress_insert_policy" ON public.learning_progress
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Own progress only
CREATE POLICY "progress_update_policy" ON public.learning_progress
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ============================================================
-- PHASE 10: RLS POLICIES - teams TABLE
-- ============================================================

-- SELECT: All authenticated can read teams
CREATE POLICY "teams_select_policy" ON public.teams
    FOR SELECT TO authenticated
    USING (true);


-- ============================================================
-- PHASE 11: INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_ojt_docs_author ON public.ojt_docs(author_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_user ON public.learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON public.learning_progress(user_id);


-- ============================================================
-- PHASE 12: VERIFICATION
-- ============================================================

SELECT 'Functions created:' as info;
SELECT proname, prosecdef as security_definer
FROM pg_proc
WHERE proname LIKE 'rls_%';

SELECT 'Policies on users:' as info;
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'users';

SELECT 'Policies on ojt_docs:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'ojt_docs';

SELECT 'COMPLETE: RLS redesign finished successfully!' as result;

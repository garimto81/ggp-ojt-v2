-- ============================================================
-- OJT Master - Sync Current DB with PRD
-- Date: 2025-12-08
--
-- Purpose: Fix missing policies and align with current schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ISSUE 1: teams table missing INSERT/UPDATE/DELETE policies
-- Admin cannot manage teams
-- ============================================================

-- Check if policies already exist, drop and recreate
DROP POLICY IF EXISTS "teams_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_update" ON public.teams;
DROP POLICY IF EXISTS "teams_delete" ON public.teams;

-- Create Admin-only policies for teams management
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

-- Grant permissions
GRANT INSERT, UPDATE, DELETE ON public.teams TO authenticated;


-- ============================================================
-- ISSUE 2: users.role should be NOT NULL
-- Currently nullable, could cause issues
-- ============================================================

-- Update any NULL roles to 'mentee'
UPDATE public.users SET role = 'mentee' WHERE role IS NULL;

-- Add NOT NULL constraint (if not exists)
-- Note: This may fail if there are NULL values
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;


-- ============================================================
-- ISSUE 3: Mentor should see all users (for assignment)
-- Current policy: Mentor can only see self
-- ============================================================

-- Drop existing select policy
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;

-- Create new policy: Admin sees all, Mentor sees all, Mentee sees self
CREATE POLICY "users_select" ON public.users
    FOR SELECT TO authenticated
    USING (
        auth.uid() = id
        OR public.rls_is_mentor_or_admin()
    );


-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'Teams policies:' as check_type;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'teams';

SELECT 'Users policies:' as check_type;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

SELECT 'Sync complete!' as result;

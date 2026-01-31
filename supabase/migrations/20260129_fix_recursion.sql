-- ============================================
-- FIX: Infinite Recursion in is_admin() Policy
-- ============================================
-- Problem: 
-- The RLS policy on 'membership_plans' calls 'is_admin()'.
-- 'is_admin()' queries 'profiles'.
-- 'profiles' has an RLS policy that calls 'is_admin()'.
-- If 'is_admin()' does not correctly bypass RLS (via SECURITY DEFINER), 
-- this creates an infinite loop.

-- Solution:
-- 1. Redefine is_admin() with explicit SECURITY DEFINER.
-- 2. Optimize profiles RLS policy to prioritize ID check.

-- 1. Function Redefinition
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Runs as superuser/creator, bypassing RLS
SET search_path = public
AS $$
BEGIN
  -- Direct check with no RLS triggered due to SECURITY DEFINER
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- 2. Policy Optimization
-- Drop potentially problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create optimized policy
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid() -- Check ownership first (fast, no recursion)
  OR 
  is_admin()      -- Check admin status (via SECURITY DEFINER function)
);

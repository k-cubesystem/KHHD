-- RLS Recursion Fix & Admin Visibility Restoration which is causing Admin Panel Issues

-- 1. Create a secure function to check admin status (Bypasses RLS Recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (postgres/superuser)
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- 2. Update Profiles RLS Policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  is_admin() OR auth.uid() = id
);

-- 3. Update Payments RLS Policy
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments"
ON payments FOR SELECT
TO authenticated
USING (
  is_admin() OR auth.uid() = user_id
);

-- 4. Ensure 'email' column exists and Admin allows update just in case
-- (Already handled by previous script but reinforcing)
CREATE POLICY "Admins can update profiles"
ON profiles FOR UPDATE
TO authenticated
USING ( is_admin() );

-- 5. Force refresh schema cache by notifying
NOTIFY pgrst, 'reload schema';

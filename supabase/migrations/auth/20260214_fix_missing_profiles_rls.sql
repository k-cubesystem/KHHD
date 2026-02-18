-- Emergency fix for missing profiles and activity_logs RLS
-- This migration fixes users who don't have profile records due to failed signup triggers

-- 1. Create profiles for users without them (insert with RLS bypass using SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.emergency_create_missing_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profiles for auth.users that don't have a profile record
  INSERT INTO public.profiles (id, full_name, email)
  SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1), '사용자') as full_name,
    au.email
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Missing profiles have been created';
END;
$$;

-- Execute the function to create missing profiles
SELECT public.emergency_create_missing_profiles();

-- 2. Fix activity_logs RLS policy to allow system operations
-- Check if activity_logs table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_logs') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_logs;
    DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
    
    -- Create permissive policy for system inserts (from triggers)
    CREATE POLICY "System can insert activity logs"
      ON public.activity_logs
      FOR INSERT
      WITH CHECK (true); -- Allow all inserts (triggered by system)
    
    -- Create policy for user reads
    CREATE POLICY "Users can view own activity"
      ON public.activity_logs
      FOR SELECT
      USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
    
    RAISE NOTICE 'activity_logs RLS policies updated';
  ELSE
    RAISE NOTICE 'activity_logs table does not exist, skipping RLS policy creation';
  END IF;
END $$;

-- 3. Verify all auth.users have profiles
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL;
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Still have % users without profiles after migration', missing_count;
  ELSE
    RAISE NOTICE 'All users now have profile records';
  END IF;
END $$;

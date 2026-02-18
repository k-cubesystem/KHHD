-- Fix: "record "new" has no field "updated_at"" error
-- This script completely resets the updated_at trigger logic

-- 1. Drop existing trigger and function (Clean slate)
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trigger_set_profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.update_profiles_updated_at() CASCADE;

-- 2. Add updated_at column if missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Update existing NULL values to ensure column is populated
UPDATE public.profiles SET updated_at = now() WHERE updated_at IS NULL;

-- 4. Create trigger function
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- 6. Verify permission
GRANT ALL ON public.profiles TO postgres, service_role, authenticated;

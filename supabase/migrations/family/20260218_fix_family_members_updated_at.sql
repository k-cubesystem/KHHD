-- Fix: "record "new" has no field "updated_at"" error on family_members table
-- Triggered when saving saju info on /protected/settings page

-- 1. Drop existing broken trigger first
DROP TRIGGER IF EXISTS update_family_members_updated_at ON public.family_members;
DROP TRIGGER IF EXISTS set_family_members_updated_at ON public.family_members;
DROP FUNCTION IF EXISTS public.update_family_members_updated_at() CASCADE;

-- 2. Add updated_at column if missing
ALTER TABLE public.family_members
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Backfill existing NULL values
UPDATE public.family_members SET updated_at = now() WHERE updated_at IS NULL;

-- 4. Create dedicated trigger function for family_members
CREATE OR REPLACE FUNCTION public.update_family_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach trigger (BEFORE UPDATE only — INSERT already sets DEFAULT now())
CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_family_members_updated_at();

-- 6. Also ensure profiles updated_at trigger is clean (in case previous migrations were partial)
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trigger_set_profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.update_profiles_updated_at() CASCADE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.profiles SET updated_at = now() WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();
